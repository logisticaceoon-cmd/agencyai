import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

type TaskRow = {
  id: string
  title: string
  status: string
  assignedTo: string[] | null
  deadline: string | null
  updatedAt?: string | null
  createdAt: string
  clientId?: string | null
}

function mapTaskToLog(task: TaskRow, userId: string) {
  // For completed tasks use updatedAt (= completion date); otherwise use createdAt
  const eventDate = task.status === 'completed'
    ? (task.updatedAt || task.createdAt)
    : task.createdAt
  const eventTime = new Date(eventDate)
  const deadline = task.deadline ? new Date(task.deadline) : null

  // was_on_time only meaningful for completed tasks
  const wasOnTime = task.status === 'completed'
    ? (deadline ? eventTime <= deadline : true)
    : true

  const delayHours = (task.status === 'completed' && !wasOnTime && deadline)
    ? Math.round((eventTime.getTime() - deadline.getTime()) / 3600000)
    : null

  return {
    id: task.id,
    workspace_id: null,
    user_id: userId,
    task_id: task.id,
    client_id: task.clientId || null,
    action_type: task.status === 'completed' ? 'task_completed' : 'task_active',
    title: task.title,
    status: task.status,
    was_on_time: wasOnTime,
    delay_hours: delayHours,
    hours_spent: null,
    month: eventTime.getMonth() + 1,
    year: eventTime.getFullYear(),
    created_at: eventDate,
  }
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

    // Fetch all tasks assigned to this user in this workspace
    let query = supabase
      .from('tasks')
      .select('id, title, status, assignedTo, deadline, createdAt, updatedAt, clientId')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('updatedAt', { ascending: false })
      .limit(500)

    if (userId) {
      query = query.contains('assignedTo', [userId])
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching tasks for performance logs:', error)
      return NextResponse.json({ data: [] })
    }

    const tasks = (data || []) as TaskRow[]

    let rows = tasks.map(t => mapTaskToLog(t, userId || ''))

    // Filter by month/year using the event date (updatedAt for completed, createdAt for others)
    if (month || year) {
      rows = rows.filter(r => {
        if (month && r.month !== parseInt(month)) return false
        if (year && r.year !== parseInt(year)) return false
        return true
      })
    }

    // Sort: completed first by date desc, then active by createdAt desc
    rows.sort((a, b) => {
      const aCompleted = a.action_type === 'task_completed'
      const bCompleted = b.action_type === 'task_completed'
      if (aCompleted && !bCompleted) return -1
      if (!aCompleted && bCompleted) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error in GET /api/performance/logs:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Log auto-generado desde tasks' })
}
