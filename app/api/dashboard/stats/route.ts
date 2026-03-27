import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    // Calculate start of current week (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startOfWeek.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Run all queries in parallel
    const [
      activeClientsResult,
      activeProjectsResult,
      tasksCompletedThisWeekResult,
      tasksOverdueResult,
      pendingTasksResult,
      recentClientsResult,
    ] = await Promise.all([
      // Active clients count
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .is('deleted_at', null),

      // Active projects count
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .is('deleted_at', null),

      // Tasks completed this week
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .gte('updated_at', startOfWeek.toISOString())
        .is('deleted_at', null),

      // Overdue tasks
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .lt('due_date', today.toISOString())
        .neq('status', 'done')
        .is('deleted_at', null),

      // Pending tasks (next 5 by due_date)
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id')
        .eq('workspace_id', workspaceId)
        .neq('status', 'done')
        .is('deleted_at', null)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(5),

      // Recent clients (last 3)
      supabase
        .from('clients')
        .select('id, name, company, email, logo_url, status')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    return NextResponse.json({
      activeClients: activeClientsResult.count || 0,
      activeProjects: activeProjectsResult.count || 0,
      tasksCompletedThisWeek: tasksCompletedThisWeekResult.count || 0,
      tasksOverdue: tasksOverdueResult.count || 0,
      pendingTasks: pendingTasksResult.data || [],
      recentClients: recentClientsResult.data || [],
    })
  } catch (err) {
    console.error('Error in GET /api/dashboard/stats:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
