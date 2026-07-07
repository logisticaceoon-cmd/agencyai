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

    // Fetch all tasks for this user in this workspace (from tasks table only)
    let query = supabase
      .from('tasks')
      .select('id, title, status, deadline, assignedTo, clientId, createdAt, updatedAt')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .limit(500)

    if (userId) {
      query = query.contains('assignedTo', [userId])
    }

    const { data: tasks, error: tasksError } = await query

    if (tasksError) {
      console.warn('Error fetching tasks for performance:', tasksError)
    }

    const taskList = tasks || []
    const now = new Date()
    const deadline48hAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    // Completed in selected period — filter by updatedAt month/year
    const completedInPeriod = taskList.filter((t: { status: string; updatedAt?: string | null; createdAt: string }) => {
      if (t.status !== 'completed') return false
      const d = new Date(t.updatedAt || t.createdAt)
      if (month && d.getMonth() + 1 !== parseInt(month)) return false
      if (year && d.getFullYear() !== parseInt(year)) return false
      return true
    })

    // Overdue: deadline > 48h ago, not completed, assigned to user
    const overdueTasks = taskList.filter((t: { deadline: string | null; status: string }) => {
      if (!t.deadline) return false
      if (t.status === 'completed') return false
      return new Date(t.deadline) < deadline48hAgo
    })

    const pending = taskList.filter((t: { status: string }) => t.status === 'pending')
    const inProgress = taskList.filter((t: { status: string }) => t.status === 'in_progress')

    return NextResponse.json({
      tasks: taskList,
      logs: completedInPeriod,
      alerts: overdueTasks,
      summary: {
        total: taskList.length,
        completed: completedInPeriod.length,
        pending: pending.length,
        in_progress: inProgress.length,
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
