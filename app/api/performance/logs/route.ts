import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// ─── Lee de tasks directamente (activity_log tiene FK incompatible con workspaces) ───

type TaskRow = {
  id: string
  title: string
  deadline?: string | null
  clientId?: string | null
  createdById?: string | null
  assignedTo?: string[]
  updatedAt: string
}

function isUserTask(task: TaskRow, userId: string): boolean {
  if (task.createdById === userId) return true
  if (Array.isArray(task.assignedTo) && task.assignedTo.includes(userId)) return true
  return false
}

function taskToLog(task: TaskRow, workspaceId: string, userId: string) {
  const deadline = task.deadline ? new Date(task.deadline) : null
  const completedAt = new Date(task.updatedAt)
  const wasOnTime = !deadline || completedAt <= deadline
  const delayHours = wasOnTime || !deadline
    ? null
    : Math.round((completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60))
  return {
    id: task.id,
    workspace_id: workspaceId,
    user_id: userId,
    task_id: task.id,
    client_id: task.clientId || null,
    action_type: 'task_completed',
    title: task.title,
    was_on_time: wasOnTime,
    delay_hours: delayHours,
    hours_spent: null,
    month: completedAt.getMonth() + 1,
    year: completedAt.getFullYear(),
    created_at: task.updatedAt,
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

    let query = supabase
      .from('tasks')
      .select('id, title, deadline, clientId, createdById, assignedTo, updatedAt')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('updatedAt', { ascending: false })
      .limit(500)

    // If month+year specified, filter by date range
    if (month && year) {
      const targetMonth = parseInt(month)
      const targetYear = parseInt(year)
      const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00`
      const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear
      const nextMonthNum = targetMonth === 12 ? 1 : targetMonth + 1
      const monthEnd = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01T00:00:00`
      query = query.gte('updatedAt', monthStart).lt('updatedAt', monthEnd)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching tasks for performance logs:', error)
      return NextResponse.json({ data: [] })
    }

    let rows = (data || []) as TaskRow[]

    // Filter by user
    if (userId) {
      rows = rows.filter(t => isUserTask(t, userId))
    }

    const logs = rows.map(t => taskToLog(t, workspaceId, userId || t.createdById || ''))

    return NextResponse.json({ data: logs })
  } catch (err) {
    console.error('Error in GET /api/performance/logs:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  // POST a logs ya no es necesario — los logs se leen directo de tasks
  // Mantener endpoint por compatibilidad pero retornar success sin escribir nada
  return NextResponse.json({ data: { message: 'Logs are now computed from tasks table' } }, { status: 201 })
}
