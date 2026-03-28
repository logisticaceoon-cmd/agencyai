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
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  // Anon client reads cookies to get the user session
  const anonClient = await createClient()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Admin client for all data queries (bypasses RLS)
  const adminClient = createAdminClient()

  // Check workspace_members first
  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role, name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (member) {
    return {
      supabase: adminClient,
      userId: user.id,
      email: user.email || '',
      fullName: member.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      workspaceId: member.workspace_id,
      role: member.role || 'member',
    }
  }

  // Check if user owns a workspace
  const { data: ownedWorkspace } = await adminClient
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (ownedWorkspace) {
    return {
      supabase: adminClient,
      userId: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      workspaceId: ownedWorkspace.id,
      role: 'owner',
    }
  }

  return NextResponse.json({ error: 'No tiene workspace. Complete el onboarding.' }, { status: 403 })
}

export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
