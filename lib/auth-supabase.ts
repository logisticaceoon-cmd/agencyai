import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export interface AuthContext {
  supabase: ReturnType<typeof createServerClient>
  userId: string
  email: string
  fullName: string
  workspaceId: string
  role: string
}

/**
 * Get authenticated user + workspace context.
 * Uses the anon client for auth (respects cookies/session),
 * and a service role query for workspace lookup (bypasses RLS).
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Use service role client to bypass RLS for workspace lookup
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )

  // Check workspace_members first
  const { data: member } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, role, name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (member) {
    return {
      supabase,
      userId: user.id,
      email: user.email || '',
      fullName: member.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      workspaceId: member.workspace_id,
      role: member.role || 'member',
    }
  }

  // Check if user owns a workspace
  const { data: ownedWorkspace } = await serviceClient
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (ownedWorkspace) {
    return {
      supabase,
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
