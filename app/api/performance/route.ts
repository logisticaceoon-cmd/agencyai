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
    const debug = searchParams.get('debug') === '1'

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    // Build date range for the selected month
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 1).toISOString()

    // Previous month for trend
    const prevStartOfMonth = new Date(year, month - 2, 1).toISOString()
    const prevEndOfMonth = startOfMonth

    // ── Debug info ────────────────────────────────────────────────────────────
    let debugInfo = null
    if (debug) {
      // Total tasks in workspace (including deleted)
      const { count: totalAll } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      // Active tasks (not deleted)
      const { count: totalActive } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)

      // Completed tasks (any status variant)
      const { data: statusCounts } = await supabase
        .from('tasks')
        .select('status')
        .eq('workspace_id', workspaceId)

      const statusMap: Record<string, number> = {}
      for (const t of statusCounts || []) {
        statusMap[t.status] = (statusMap[t.status] || 0) + 1
      }

      // Tasks with completed_at set
      const { count: withCompletedAt } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .not('completed_at', 'is', null)

      // Date range of completed_at
      const { data: dateRange } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('workspace_id', workspaceId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true })
        .limit(1)

      const { data: dateRangeMax } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('workspace_id', workspaceId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)

      // Check assignee column usage
      const { data: assigneeSample } = await supabase
        .from('tasks')
        .select('assignee_id, "assignedTo"')
        .eq('workspace_id', workspaceId)
        .limit(5)

      // Check deleted_at status
      const { count: deletedCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .not('deleted_at', 'is', null)

      debugInfo = {
        total_tasks_all: totalAll || 0,
        total_tasks_active: totalActive || 0,
        total_tasks_deleted: deletedCount || 0,
        status_counts: statusMap,
        tasks_with_completed_at: withCompletedAt || 0,
        completed_at_min: dateRange?.[0]?.completed_at || null,
        completed_at_max: dateRangeMax?.[0]?.completed_at || null,
        assignee_sample: assigneeSample || [],
        query_filters: {
          workspace_id: workspaceId,
          month_range: `${startOfMonth} — ${endOfMonth}`,
          user_id_filter: userId || 'none (all users)',
        },
      }
    }

    // ── Main queries ──────────────────────────────────────────────────────────
    // IMPORTANT: Include soft-deleted tasks for performance tracking
    // Completed work counts even if the task was later archived/deleted

    // 1. Tasks completed in the selected month (filtered by completed_at)
    //    Also try updatedAt/updated_at as fallback for tasks without completed_at
    let completedQuery = supabase
      .from('tasks')
      .select('id, title, status, assignee_id, "assignedTo", due_date, "deadline", completed_at, created_at, "createdAt", updated_at, "updatedAt", project_id, "projectId", projects(name)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')

    if (userId && userId !== 'all') {
      // Try both column names for assignee
      completedQuery = completedQuery.or(`assignee_id.eq.${userId},"assignedTo".cs.{${userId}}`)
    }

    const { data: allCompleted } = await completedQuery

    // Filter by month manually — supports completed_at, updated_at, updatedAt as fallback
    const startMs = new Date(startOfMonth).getTime()
    const endMs = new Date(endOfMonth).getTime()
    const prevStartMs = new Date(prevStartOfMonth).getTime()
    const prevEndMs = new Date(prevEndOfMonth).getTime()

    function getCompletionDate(t: Record<string, unknown>): Date {
      const raw = t.completed_at || t.updated_at || t.updatedAt || t.created_at || t.createdAt
      return new Date(raw as string)
    }

    const completed = (allCompleted || []).filter(t => {
      const d = getCompletionDate(t).getTime()
      return d >= startMs && d < endMs
    })

    const prevCompleted = (allCompleted || []).filter(t => {
      const d = getCompletionDate(t).getTime()
      return d >= prevStartMs && d < prevEndMs
    })

    // 2. Current pending/in-progress tasks (NOT filtered by month)
    let pendingQuery = supabase
      .from('tasks')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .in('status', ['pending', 'in_progress'])

    if (userId && userId !== 'all') {
      pendingQuery = pendingQuery.or(`assignee_id.eq.${userId},"assignedTo".cs.{${userId}}`)
    }

    const { data: pendingTasks } = await pendingQuery

    const pending = (pendingTasks || []).filter(t => t.status === 'pending')
    const inProgress = (pendingTasks || []).filter(t => t.status === 'in_progress')

    // ── Calculate metrics ─────────────────────────────────────────────────────

    // On-time rate
    const completedWithDeadline = completed.filter(t => t.due_date || t.deadline)
    const onTimeCount = completedWithDeadline.filter(t => {
      const completedDate = getCompletionDate(t)
      const dueStr = (t.due_date || t.deadline) as string
      const dueDate = new Date(dueStr + (dueStr.includes('T') ? '' : 'T23:59:59'))
      return completedDate <= dueDate
    }).length
    const onTimeRate = completedWithDeadline.length > 0
      ? Math.round((onTimeCount / completedWithDeadline.length) * 100)
      : 100

    // Average completion time
    const completionTimes = completed
      .filter(t => (t.created_at || t.createdAt) && (t.completed_at || t.updated_at || t.updatedAt))
      .map(t => {
        const created = new Date((t.created_at || t.createdAt) as string).getTime()
        const done = getCompletionDate(t).getTime()
        return (done - created) / (1000 * 60 * 60)
      })
      .filter(h => h > 0)
    const avgCompletionHours = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0

    // Build bitacora
    const bitacora = completed.map(t => {
      const completedDate = getCompletionDate(t)
      const dueStr = (t.due_date || t.deadline) as string | null
      const dueDate = dueStr ? new Date(dueStr + (dueStr.includes('T') ? '' : 'T23:59:59')) : null
      const wasOnTime = !dueDate || completedDate <= dueDate
      const delayHours = !wasOnTime && dueDate
        ? Math.round((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60))
        : null

      // Get assignee
      const assignee = (t.assignee_id as string) ||
        (Array.isArray(t.assignedTo) && t.assignedTo.length > 0 ? t.assignedTo[0] : null)

      return {
        id: t.id,
        title: t.title,
        project_name: (t.projects as unknown as { name: string } | null)?.name || null,
        completed_at: completedDate.toISOString(),
        created_at: ((t.created_at || t.createdAt) as string),
        due_date: dueStr,
        was_on_time: wasOnTime,
        delay_hours: delayHours,
        assignee_id: assignee,
      }
    }).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

    return NextResponse.json({
      summary: {
        completed: completed.length,
        pending: pending.length,
        in_progress: inProgress.length,
        on_time_rate: onTimeRate,
        avg_completion_hours: avgCompletionHours,
        prev_month_completed: prevCompleted.length,
        trend: completed.length - prevCompleted.length,
      },
      bitacora,
      ...(debugInfo ? { debug: debugInfo } : {}),
    })
  } catch (err) {
    console.error('Error in GET /api/performance:', err)
    return NextResponse.json({
      summary: { completed: 0, pending: 0, in_progress: 0, on_time_rate: 100, avg_completion_hours: 0, prev_month_completed: 0, trend: 0 },
      bitacora: [],
    })
  }
}
