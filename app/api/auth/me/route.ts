import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()

    // If auth failed with 403 (no workspace), return basic user info
    if (isAuthError(auth)) {
      // Try to get just the user without workspace
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          avatarUrl: user.user_metadata?.avatar_url || null,
          role: 'member',
        },
        org: null,
      })
    }

    const { userId, email, fullName, workspaceId, role, supabase } = auth

    // Get workspace info using service role
    const serviceClient = (await import('@supabase/ssr')).createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )

    const { data: workspace } = await serviceClient
      .from('workspaces')
      .select('id, name, slug, plan, currency, agency_type')
      .eq('id', workspaceId)
      .single()

    // Get member count
    const { count: memberCount } = await serviceClient
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    // Get client count
    const { count: clientCount } = await serviceClient
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)

    return NextResponse.json({
      user: {
        id: userId,
        email,
        fullName,
        avatarUrl: null,
        role,
      },
      org: workspace ? {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan || 'free',
        maxUsers: 100,
        maxClients: 100,
        memberCount: memberCount || 0,
        clientCount: clientCount || 0,
      } : null,
    })
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
