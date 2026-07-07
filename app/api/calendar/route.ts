import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM

    if (!month) {
      return NextResponse.json({ error: 'Parámetro month requerido (YYYY-MM)' }, { status: 400 })
    }

    // Calculate month range
    const [year, mon] = month.split('-').map(Number)
    const startDate = new Date(year, mon - 1, 1).toISOString()
    const endDate = new Date(year, mon, 0, 23, 59, 59, 999).toISOString()

    // Fetch tasks and milestones in parallel
    const [tasksResult, milestonesResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, priority, deadline, projectId, assignee_id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .gte('deadline', startDate)
        .lte('deadline', endDate)
        .order('deadline', { ascending: true }),

      supabase
        .from('project_milestones')
        .select('id, title, deadline, completed, description, project_id')
        .eq('workspace_id', workspaceId)
        .gte('deadline', startDate)
        .lte('deadline', endDate)
        .order('deadline', { ascending: true }),
    ])

    // Enrich milestones with project names
    const milestones = milestonesResult.data || []
    const projectIds = [...new Set(milestones.map((m: { project_id: string }) => m.project_id).filter(Boolean))]
    let projectMap: Record<string, string> = {}
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds)
      if (projects) {
        projectMap = Object.fromEntries(projects.map((p: { id: string; name: string }) => [p.id, p.name]))
      }
    }
    const enrichedMilestones = milestones.map((m: { project_id?: string; [key: string]: unknown }) => ({
      ...m,
      project_name: m.project_id ? (projectMap[m.project_id] || null) : null,
    }))

    return NextResponse.json({
      tasks: tasksResult.data || [],
      milestones: enrichedMilestones,
    })
  } catch (err) {
    console.error('Error in GET /api/calendar:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
