import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { PLANS } from '@/lib/plans'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params
    if (workspaceId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch members with user profile
    const { data: members } = await supabase
      .from('workspace_members')
      .select('id, role, status, user_id')
      .eq('workspace_id', id)

    // Fetch user profiles for each member
    const memberList = []
    for (const m of members || []) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, avatar_url, role, department')
        .eq('user_id', m.user_id)
        .single()
      memberList.push({
        id: m.id,
        role: m.role || 'member',
        status: m.status || 'active',
        user: {
          id: m.user_id,
          fullName: profile?.full_name || profile?.email || 'Miembro',
          email: profile?.email || '',
          avatarUrl: profile?.avatar_url || null,
          role: profile?.role || m.role || 'member',
          department: profile?.department || null,
        },
      })
    }

    // If no members found, add current user as owner
    if (memberList.length === 0) {
      const { data: me } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, avatar_url, role, department, user_id')
        .eq('workspace_id', id)
        .limit(1)
        .single()
      if (me) {
        memberList.push({
          id: me.id,
          role: 'admin',
          status: 'active',
          user: {
            id: me.user_id || me.id,
            fullName: me.full_name || me.email || 'Owner',
            email: me.email || '',
            avatarUrl: me.avatar_url || null,
            role: 'admin',
            department: me.department || null,
          },
        })
      }
    }

    // Fetch counts
    const [{ count: clientCount }, { count: taskCount }, { count: reportCount }] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('workspace_id', id),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', id),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('workspace_id', id),
    ])

    // Get plan limits
    const plan = PLANS.find((p) => p.id === workspace.plan) ?? PLANS[0]

    const data = {
      ...workspace,
      ownerId: workspace.owner_id || workspace.ownerId,
      maxUsers: plan.maxUsers,
      maxClients: plan.maxClients,
      members: memberList,
      _count: {
        clients: clientCount || 0,
        tasks: taskCount || 0,
        reports: reportCount || 0,
      },
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/organizations/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const { id } = await params
    if (workspaceId !== id || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.website !== undefined) updateData.website = body.website
    if (body.timezone !== undefined) updateData.timezone = body.timezone
    if (body.agency_type !== undefined) updateData.agency_type = body.agency_type
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
