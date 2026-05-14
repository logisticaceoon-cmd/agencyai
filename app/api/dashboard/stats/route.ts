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

    // Find workspace
    let workspaceId: string | null = null

    const { data: ws } = await admin
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    workspaceId = ws?.id || null

    if (!workspaceId) {
      const { data: member } = await admin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      workspaceId = member?.workspace_id || null
    }

    if (!workspaceId) {
      return NextResponse.json({
        activeClients: 0,
        activeProjects: 0,
        tasksCompletedThisWeek: 0,
        tasksOverdue: 0,
        pendingTasks: [],
        recentClients: [],
      })
    }

    const now = new Date()
    const startOfWeek = new Date(now)
    const dayOfWeek = now.getDay()
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startOfWeek.setHours(0, 0, 0, 0)

    const today = now.toISOString().split('T')[0]

    const [
      clientsRes,
      projectsRes,
      doneRes,
      overdueRes,
      pendingRes,
      recentRes,
    ] = await Promise.all([
      admin.from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .is('deleted_at', null),
      admin.from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active'),
      admin.from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .gte('updatedAt', startOfWeek.toISOString()),
      admin.from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('status', 'done')
        .lt('deadline', today),
      admin.from('tasks')
        .select('id, title, status, priority, deadline')
        .eq('workspace_id', workspaceId)
        .neq('status', 'done')
        .not('deadline', 'is', null)
        .order('deadline', { ascending: true })
        .limit(5),
      admin.from('clients')
        .select('id, name, company, email, status')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    return NextResponse.json({
      activeClients: clientsRes.count || 0,
      activeProjects: projectsRes.count || 0,
      tasksCompletedThisWeek: doneRes.count || 0,
      tasksOverdue: overdueRes.count || 0,
      pendingTasks: pendingRes.data || [],
      recentClients: recentRes.data || [],
    })
  } catch (err) {
    console.error('Error in GET /api/dashboard/stats:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
