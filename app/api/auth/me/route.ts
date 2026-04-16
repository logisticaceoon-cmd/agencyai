import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Find workspace - check owner first, then members
    let workspaceId: string | null = null
    let role = 'member'
    let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'

    const { data: ownedWs } = await admin
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownedWs) {
      workspaceId = ownedWs.id
      role = 'owner'
    } else {
      const { data: member } = await admin
        .from('workspace_members')
        .select('workspace_id, role, name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (member) {
        workspaceId = member.workspace_id
        role = member.role || 'member'
        fullName = member.name || fullName
      }
    }

    let org = null
    if (workspaceId) {
      const { data: workspace } = await admin
        .from('workspaces')
        .select('id, name, slug, plan, currency, agency_type')
        .eq('id', workspaceId)
        .single()

      if (workspace) {
        org = {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          plan: workspace.plan || 'free',
          maxUsers: 100,
          maxClients: 100,
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName,
        avatarUrl: user.user_metadata?.avatar_url || null,
        role,
      },
      org,
    })
  } catch (err) {
    console.error('Error in GET /api/auth/me:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
