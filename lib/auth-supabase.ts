import { createServerSupabaseClient } from './supabase-server'
import { NextResponse } from 'next/server'

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  userId: string
  email: string
  fullName: string
  workspaceId: string
  role: string
}

/**
 * Get authenticated user + workspace context from Supabase.
 * Returns AuthContext or a NextResponse error.
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Find workspace membership
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!member) {
    // Check if user owns a workspace directly
    const { data: ownedWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (!ownedWorkspace) {
      return NextResponse.json({ error: 'No tiene workspace. Complete el onboarding.' }, { status: 403 })
    }

    return {
      supabase,
      userId: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      workspaceId: ownedWorkspace.id,
      role: 'owner',
    }
  }

  return {
    supabase,
    userId: user.id,
    email: user.email || '',
    fullName: member.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
    workspaceId: member.workspace_id,
    role: member.role || 'member',
  }
}

/**
 * Helper to check if the result is a NextResponse (error) or AuthContext.
 */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
