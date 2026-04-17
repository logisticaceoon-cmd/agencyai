import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface AuthContext {
  supabase: ReturnType<typeof createAdminClient>
  userId: string
  email: string
  fullName: string
  workspaceId: string
  role: string
}

/**
 * Get authenticated user + workspace context.
 *
 * Uses the ANON client (with user session/cookies) for workspace lookup
 * since RLS policies allow users to see their own workspaces.
 * Returns admin client for data queries (bypasses RLS).
 *
 * This approach works even if SUPABASE_SERVICE_ROLE_KEY has issues,
 * because the workspace lookup uses the user's own session.
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  try {
    // Anon client reads cookies to get the user session
    const anonClient = await createClient()
    const { data: { user }, error: authError } = await anonClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Admin client for data queries after we find workspace
    const adminClient = createAdminClient()

    let workspaceId: string | null = null
    let role = 'member'
    let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'

    // Use ANON client for workspace lookup (works via RLS with user session)
    // This is the same client that successfully authenticates the user

    // Step 1: Check if user owns a workspace
    const { data: ownedWs, error: ownerErr } = await anonClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownerErr) {
      console.error('getAuthContext owner query error:', ownerErr.message)
    }

    if (ownedWs) {
      workspaceId = ownedWs.id
      role = 'owner'
    }

    // Fallback: if anon didn't find it (RLS or session issue), try admin
    if (!workspaceId) {
      const { data: ownedWsAdmin } = await adminClient
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (ownedWsAdmin) {
        workspaceId = ownedWsAdmin.id
        role = 'owner'
      }
    }

    // Step 2: If not owner, check workspace_members
    if (!workspaceId) {
      const { data: member, error: memberErr } = await anonClient
        .from('workspace_members')
        .select('workspace_id, role, name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (memberErr) {
        console.error('getAuthContext members query error:', memberErr.message)
      }

      if (member) {
        workspaceId = member.workspace_id
        role = member.role || 'member'
        fullName = member.name || fullName
      }

      // Fallback: try admin if anon didn't find membership
      if (!workspaceId) {
        const { data: memberAdmin } = await adminClient
          .from('workspace_members')
          .select('workspace_id, role, name')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        if (memberAdmin) {
          workspaceId = memberAdmin.workspace_id
          role = memberAdmin.role || 'member'
          fullName = memberAdmin.name || fullName
        }
      }
    }

    // Step 3: Ensure owner has a workspace_members row
    if (workspaceId && role === 'owner') {
      try {
        await adminClient
          .from('workspace_members')
          .upsert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: 'owner',
            name: fullName,
            status: 'active',
          }, { onConflict: 'workspace_id,user_id', ignoreDuplicates: true })
      } catch {
        // ignore - best effort
      }
    }

    if (!workspaceId) {
      console.error('getAuthContext: no workspace found for user', user.id, user.email)
      return NextResponse.json({ error: 'No tiene workspace. Complete el onboarding.' }, { status: 403 })
    }

    return {
      supabase: adminClient,
      userId: user.id,
      email: user.email || '',
      fullName,
      workspaceId,
      role,
    }
  } catch (err) {
    console.error('getAuthContext unexpected error:', err)
    return NextResponse.json({ error: 'Error de autenticacion' }, { status: 500 })
  }
}

export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
