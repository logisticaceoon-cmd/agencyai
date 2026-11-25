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
 * Uses admin client for ALL db queries to avoid RLS/session latency issues.
 * Single query path: auth.getUser() → workspaces (owner) → workspace_members (member).
 * No UPSERT on every call — that was causing extra writes on every request.
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  try {
    // Use anon client only for session cookie read (required for browser auth)
    const anonClient = await createClient()
    const { data: { user }, error: authError } = await anonClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    let workspaceId: string | null = null
    let role = 'member'
    let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'

    // Single query: check owner first (admin client — fast, no RLS)
    const { data: ownedWs, error: ownerErr } = await adminClient
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

    // If not owner, check membership
    if (!workspaceId) {
      const { data: member, error: memberErr } = await adminClient
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

