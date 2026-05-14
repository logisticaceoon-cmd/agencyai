import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityLogRow = {
  id: string
  userId: string
  organizationId: string
  taskId?: string | null
  actionType: string
  description?: string | null
  changes?: Record<string, unknown> | null
  createdAt: string
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Get tasks assigned to this member (no deleted_at column in schema)
    let tasksQuery = supabase
      .from('tasks')
      .select('id, title, status, deadline, assignedTo, clientId, createdAt, updatedAt')
      .eq('workspace_id', workspaceId)

    if (userId) tasksQuery = tasksQuery.contains('assignedTo', [userId])

    const { data: tasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      console.warn('Error fetching tasks for performance:', tasksError)
      // Don't return 500 — gracefully continue with empty tasks
    }

    // Get performance logs from activity_log
    let logsQuery = supabase
      .from('activity_log')
      .select('*')
      .eq('organizationId', workspaceId)
      .eq('actionType', 'performance_task_completed')
      .order('created_at', { ascending: false })
      .limit(200)

    if (userId) logsQuery = logsQuery.eq('userId', userId)

    const { data: logsRaw } = await logsQuery

    // Filter by month/year from changes JSON
    let logs = ((logsRaw || []) as ActivityLogRow[]).map(row => {
      const c = (row.changes || {}) as Record<string, unknown>
      return {
        id: row.id,
        user_id: row.userId,
        task_id: row.taskId || null,
        was_on_time: c.wasOnTime !== false,
        delay_hours: (c.delayHours as number) || null,
        hours_spent: (c.hoursSpent as number) || null,
        month: (c.month as number) || new Date(row.createdAt).getMonth() + 1,
        year: (c.year as number) || new Date(row.createdAt).getFullYear(),
        created_at: row.createdAt,
      }
    })

    if (month) logs = logs.filter(l => l.month === parseInt(month))
    if (year) logs = logs.filter(l => l.year === parseInt(year))

    // Calculate summary from tasks + logs
    const taskList = tasks || []
    const now = new Date()
    const overdueTasks = taskList.filter(t => {
      if (!t.deadline) return false
      if (t.status === 'completed') return false
      const deadline = new Date(t.deadline)
      const diffHours = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60)
      return diffHours > 48
    })

    return NextResponse.json({
      tasks: taskList,
      logs,
      alerts: overdueTasks,
      summary: {
        total: taskList.length,
        completed: logs.length, // logs = completed in period
        pending: taskList.filter((t: { status: string }) => t.status === 'pending').length,
        in_progress: taskList.filter((t: { status: string }) => t.status === 'in_progress').length,
        overdue: overdueTasks.length,
      }
    })
  } catch (err) {
    console.error('Error in GET /api/performance:', err)
    return NextResponse.json({
      tasks: [],
      logs: [],
      alerts: [],
      summary: { total: 0, completed: 0, pending: 0, in_progress: 0, overdue: 0 }
    })
  }
}
