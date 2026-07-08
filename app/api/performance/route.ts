import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const month = parseInt(searchParams.get('month') || '0')
    const year = parseInt(searchParams.get('year') || '0')

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    // Build date range for the selected month
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 1).toISOString()

    // Previous month for trend
    const prevStartOfMonth = new Date(year, month - 2, 1).toISOString()
    const prevEndOfMonth = startOfMonth

    // 1. Tasks completed in the selected month (filtered by completed_at)
    let completedQuery = supabase
      .from('tasks')
      .select('id, title, status, assignee_id, due_date, completed_at, created_at, project_id, projects(name)')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .eq('status', 'completed')
      .gte('completed_at', startOfMonth)
      .lt('completed_at', endOfMonth)

    if (userId) {
      completedQuery = completedQuery.eq('assignee_id', userId)
    }

    const { data: completedTasks } = await completedQuery

    // 2. Tasks completed in previous month (for trend)
    let prevCompletedQuery = supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .eq('status', 'completed')
      .gte('completed_at', prevStartOfMonth)
      .lt('completed_at', prevEndOfMonth)

    if (userId) {
      prevCompletedQuery = prevCompletedQuery.eq('assignee_id', userId)
    }

    const { data: prevCompleted } = await prevCompletedQuery

    // 3. Current pending/in-progress tasks (NOT filtered by month — these are current state)
    let pendingQuery = supabase
      .from('tasks')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .in('status', ['pending', 'in_progress'])

    if (userId) {
      pendingQuery = pendingQuery.eq('assignee_id', userId)
    }

    const { data: pendingTasks } = await pendingQuery

    const completed = completedTasks || []
    const pending = (pendingTasks || []).filter(t => t.status === 'pending')
    const inProgress = (pendingTasks || []).filter(t => t.status === 'in_progress')

    // Calculate on-time rate: completed tasks where completed_at <= due_date
    const completedWithDeadline = completed.filter(t => t.due_date)
    const onTimeCount = completedWithDeadline.filter(t => {
      const completedDate = new Date(t.completed_at!)
      const dueDate = new Date(t.due_date + 'T23:59:59')
      return completedDate <= dueDate
    }).length
    const onTimeRate = completedWithDeadline.length > 0
      ? Math.round((onTimeCount / completedWithDeadline.length) * 100)
      : 100

    // Average completion time (created_at → completed_at) in hours
    const completionTimes = completed
      .filter(t => t.created_at && t.completed_at)
      .map(t => {
        const created = new Date(t.created_at).getTime()
        const done = new Date(t.completed_at!).getTime()
        return (done - created) / (1000 * 60 * 60) // hours
      })
    const avgCompletionHours = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0

    // Build bitacora entries from completed tasks
    const bitacora = completed.map(t => {
      const completedDate = new Date(t.completed_at!)
      const dueDate = t.due_date ? new Date(t.due_date + 'T23:59:59') : null
      const wasOnTime = !dueDate || completedDate <= dueDate
      const delayHours = !wasOnTime && dueDate
        ? Math.round((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60))
        : null

      return {
        id: t.id,
        title: t.title,
        project_name: (t.projects as unknown as { name: string } | null)?.name || null,
        completed_at: t.completed_at,
        created_at: t.created_at,
        due_date: t.due_date,
        was_on_time: wasOnTime,
        delay_hours: delayHours,
      }
    }).sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

    return NextResponse.json({
      summary: {
        completed: completed.length,
        pending: pending.length,
        in_progress: inProgress.length,
        on_time_rate: onTimeRate,
        avg_completion_hours: avgCompletionHours,
        prev_month_completed: (prevCompleted || []).length,
        trend: completed.length - (prevCompleted || []).length,
      },
      bitacora,
    })
  } catch (err) {
    console.error('Error in GET /api/performance:', err)
    return NextResponse.json({
      summary: { completed: 0, pending: 0, in_progress: 0, on_time_rate: 100, avg_completion_hours: 0, prev_month_completed: 0, trend: 0 },
      bitacora: [],
    })
  }
}
