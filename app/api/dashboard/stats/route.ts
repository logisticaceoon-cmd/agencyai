import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

export async function GET() {
  try {
    // Usar getAuthContext para tener rol del usuario
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth

    const { userId, workspaceId, role } = auth
    const admin = createAdminClient()

    const appRole = normalizeRole(role)
    const scope = getDataScope('clients', appRole)

    const now = new Date()
    const startOfWeek = new Date(now)
    const dayOfWeek = now.getDay()
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startOfWeek.setHours(0, 0, 0, 0)
    const today = now.toISOString().split('T')[0]

    // ─── Para trafficker: resolver IDs de clientes y proyectos asignados ──────
    let assignedClientIds: string[] | null = null
    let assignedProjectIds: string[] | null = null

    if (scope === 'assigned') {
      // Proyectos donde son owner_id
      const { data: myProjects } = await admin
        .from('projects')
        .select('id, clientId')
        .eq('workspace_id', workspaceId)
        .eq('owner_id', userId)

      // Proyectos con tareas asignadas al usuario
      const { data: myTaskProjects } = await admin
        .from('tasks')
        .select('projectId, clientId')
        .eq('workspace_id', workspaceId)
        .contains('assignedTo', [userId])

      const fromProjectIds = (myProjects || []).map((p: { id: string }) => p.id)
      const fromTaskProjectIds = (myTaskProjects || [])
        .map((t: { projectId: string }) => t.projectId)
        .filter(Boolean)

      assignedProjectIds = [...new Set([...fromProjectIds, ...fromTaskProjectIds])]

      const clientsFromProjects = (myProjects || [])
        .map((p: { clientId: string }) => p.clientId)
        .filter(Boolean)
      const clientsFromTasks = (myTaskProjects || [])
        .map((t: { clientId: string }) => t.clientId)
        .filter(Boolean)

      assignedClientIds = [...new Set([...clientsFromProjects, ...clientsFromTasks])]
    }

    // ─── Queries en paralelo con filtros por rol ───────────────────────────────
    let clientsQuery = admin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .is('deleted_at', null)

    let projectsQuery = admin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    let doneQuery = admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'done')
      .gte('updatedAt', startOfWeek.toISOString())

    let overdueQuery = admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .neq('status', 'done')
      .lt('deadline', today)

    let pendingQuery = admin
      .from('tasks')
      .select('id, title, status, priority, deadline')
      .eq('workspace_id', workspaceId)
      .neq('status', 'done')
      .not('deadline', 'is', null)
      .order('deadline', { ascending: true })
      .limit(5)

    let recentQuery = admin
      .from('clients')
      .select('id, name, company, email, status')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('createdAt', { ascending: false })
      .limit(3)

    // Aplicar filtros de scope si es trafficker
    if (assignedClientIds !== null) {
      if (assignedClientIds.length > 0) {
        clientsQuery = clientsQuery.in('id', assignedClientIds) as typeof clientsQuery
        recentQuery = recentQuery.in('id', assignedClientIds) as typeof recentQuery
      } else {
        // No tiene clientes asignados — devolver 0
        return NextResponse.json({
          activeClients: 0, activeProjects: 0,
          tasksCompletedThisWeek: 0, tasksOverdue: 0,
          pendingTasks: [], recentClients: [],
        })
      }
    }

    if (assignedProjectIds !== null) {
      if (assignedProjectIds.length > 0) {
        projectsQuery = projectsQuery.in('id', assignedProjectIds) as typeof projectsQuery
      } else {
        projectsQuery = projectsQuery.in('id', ['00000000-0000-0000-0000-000000000000']) as typeof projectsQuery
      }
    }

    if (scope === 'assigned') {
      doneQuery = doneQuery.contains('assignedTo', [userId]) as typeof doneQuery
      overdueQuery = overdueQuery.contains('assignedTo', [userId]) as typeof overdueQuery
      pendingQuery = pendingQuery.contains('assignedTo', [userId]) as typeof pendingQuery
    }

    const [clientsRes, projectsRes, doneRes, overdueRes, pendingRes, recentRes] =
      await Promise.all([clientsQuery, projectsQuery, doneQuery, overdueQuery, pendingQuery, recentQuery])

    const response = NextResponse.json({
      activeClients: clientsRes.count || 0,
      activeProjects: projectsRes.count || 0,
      tasksCompletedThisWeek: doneRes.count || 0,
      tasksOverdue: overdueRes.count || 0,
      pendingTasks: pendingRes.data || [],
      recentClients: recentRes.data || [],
    })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (err) {
    console.error('Error in GET /api/dashboard/stats:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
