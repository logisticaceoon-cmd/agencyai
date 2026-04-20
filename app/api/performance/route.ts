import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Get tasks assigned to members, grouped by user
    let query = supabase
      .from('tasks')
      .select('id, title, status, deadline, assignedTo, clientId, createdAt, updatedAt')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)

    if (userId) query = query.contains('assignedTo', [userId])

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get performance logs
    let logsQuery = supabase
      .from('performance_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (userId) logsQuery = logsQuery.eq('user_id', userId)
    if (month) logsQuery = logsQuery.eq('month', parseInt(month))
    if (year) logsQuery = logsQuery.eq('year', parseInt(year))

    const { data: logs } = await logsQuery

    // Get alerts: tasks overdue (deadline passed and not completed)
    const now = new Date()
    const overdueTasks = (tasks || []).filter(t => {
      if (!t.deadline) return false
      if (t.status === 'completed') return false
      const deadline = new Date(t.deadline)
      const diffHours = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60)
      return diffHours > 48
    })

    return NextResponse.json({
      tasks: tasks || [],
      logs: logs || [],
      alerts: overdueTasks,
      summary: {
        total: tasks?.length || 0,
        completed: tasks?.filter((t: { status: string }) => t.status === 'completed').length || 0,
        pending: tasks?.filter((t: { status: string }) => t.status === 'pending').length || 0,
        in_progress: tasks?.filter((t: { status: string }) => t.status === 'in_progress').length || 0,
        overdue: overdueTasks.length,
      }
    })
  } catch (err) {
    console.error('Error in GET /api/performance:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
