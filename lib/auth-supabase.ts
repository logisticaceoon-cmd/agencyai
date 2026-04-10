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
 * Uses anon client for auth (reads cookies/session).
 * Returns admin client for data queries (bypasses RLS).
 *
 * Mirrors the exact logic from /api/auth/me which is known to work.
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  try {
    // Anon client reads cookies to get the user session
    const anonClient = await createClient()
    const { data: { user }, error: authError } = await anonClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Admin client for all data queries (bypasses RLS)
    const adminClient = createAdminClient()

    let workspaceId: string | null = null
    let role = 'member'
    let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'

    // Step 1: Check if user owns a workspace (same order as /api/auth/me)
    const { data: ownedWs, error: ownerErr } = await adminClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownerErr) {
      console.error('getAuthContext: workspace owner query error:', ownerErr.message)
    }

    if (ownedWs) {
      workspaceId = ownedWs.id
      role = 'owner'

      // Ensure owner exists in workspace_members for consistency
      const { data: existingMember } = await adminClient
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', ownedWs.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingMember) {
        await adminClient.from('workspace_members').insert({
          workspace_id: ownedWs.id,
          user_id: user.id,
          role: 'owner',
          name: fullName,
          status: 'active',
        })
      }
    } else {
      // Step 2: Check workspace_members
      const { data: member, error: memberErr } = await adminClient
        .from('workspace_members')
        .select('workspace_id, role, name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (memberErr) {
        console.error('getAuthContext: workspace_members query error:', memberErr.message)
      }

      if (member) {
        workspaceId = member.workspace_id
        role = member.role || 'member'
        fullName = member.name || fullName
      }
    }

    if (!workspaceId) {
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
    console.error('getAuthContext: unexpected error:', err)
    return NextResponse.json({ error: 'Error de autenticacion' }, { status: 500 })
  }
}

export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
