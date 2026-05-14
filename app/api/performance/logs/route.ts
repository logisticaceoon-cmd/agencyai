import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// Rendimiento: lee directamente de la tabla tasks (workspace_id funciona correctamente)
// activity_log tiene FK a organizations (tabla legacy) que no coincide con workspace_id

type TaskRow = {
  id: string
  title: string
  status: string
  createdById: string | null
  assignedTo: string[] | null
  deadline: string | null
  updatedAt?: string | null
  createdAt: string
  clientId?: string | null
}

function mapTaskToLog(task: TaskRow, userId: string) {
  const completedAt = task.updatedAt || task.createdAt
  const completedDate = new Date(completedAt)
  const deadline = task.deadline ? new Date(task.deadline) : null
  const wasOnTime = deadline ? completedDate <= deadline : true
  const delayHours = (!wasOnTime && deadline)
    ? Math.round((completedDate.getTime() - deadline.getTime()) / 3600000)
    : null

  return {
    id: task.id,
    workspace_id: null,
    user_id: userId,
    task_id: task.id,
    client_id: task.clientId || null,
    action_type: 'task_completed',
    title: task.title,
    was_on_time: wasOnTime,
    delay_hours: delayHours,
    hours_spent: null,
    month: completedDate.getMonth() + 1,
    year: completedDate.getFullYear(),
    created_at: completedAt,
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

    // Query completed tasks for this workspace
    let query = supabase
      .from('tasks')
      .select('id, title, status, createdById, assignedTo, deadline, createdAt, clientId')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(500)

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching tasks for performance:', error)
      return NextResponse.json({ data: [] })
    }

    const tasks = (data || []) as TaskRow[]

    // Filter by userId: tasks created by or assigned to this user
    const filtered = userId
      ? tasks.filter(t =>
          t.createdById === userId ||
          (Array.isArray(t.assignedTo) && t.assignedTo.includes(userId))
        )
      : tasks

    let rows = filtered.map(t => mapTaskToLog(t, userId || t.createdById || ''))

    if (month) rows = rows.filter(r => r.month === parseInt(month))
    if (year) rows = rows.filter(r => r.year === parseInt(year))

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error in GET /api/performance/logs:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  // POST no es necesario en el nuevo modelo (las tareas se registran al completarse)
  return NextResponse.json({ success: true, message: 'Log auto-generado desde tasks' })
}
