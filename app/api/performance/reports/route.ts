import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// ─── Lee de tasks directamente (activity_log tiene FK incompatible con workspaces) ───
// Fuente de verdad: tasks.status = 'completed' + tasks.updatedAt para filtro de mes

type TaskRow = {
  id: string
  title: string
  deadline?: string | null
  clientId?: string | null
  createdById?: string | null
  assignedTo?: string[]
  updatedAt: string
  workspace_id: string
}

function computeWasOnTime(task: TaskRow): boolean {
  if (!task.deadline) return true
  const deadline = new Date(task.deadline)
  const completedAt = new Date(task.updatedAt)
  return completedAt <= deadline
}

function delayHours(task: TaskRow): number | null {
  if (!task.deadline) return null
  const deadline = new Date(task.deadline)
  const completedAt = new Date(task.updatedAt)
  if (completedAt <= deadline) return null
  return Math.round((completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60))
}

function isUserTask(task: TaskRow, userId: string): boolean {
  if (task.createdById === userId) return true
  if (Array.isArray(task.assignedTo) && task.assignedTo.includes(userId)) return true
  return false
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

    if (!userId || !month || !year) {
      return NextResponse.json({ data: [] })
    }

    const targetMonth = parseInt(month)
    const targetYear = parseInt(year)

    // Date range for the month
    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00`
    const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1
    const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`

    // Read completed tasks in the workspace for the period
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, deadline, clientId, createdById, assignedTo, updatedAt, workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .gte('updatedAt', monthStart)
      .lt('updatedAt', monthEnd)
      .order('updatedAt', { ascending: false })
      .limit(500)

    if (error) {
      console.warn('Error fetching tasks for performance reports:', error)
      return NextResponse.json({ data: [] })
    }

    const userTasks = ((tasks || []) as TaskRow[]).filter(t => isUserTask(t, userId))
    const delayed = userTasks.filter(t => !computeWasOnTime(t))
    const onTimeRate = userTasks.length > 0
      ? Math.round(((userTasks.length - delayed.length) / userTasks.length) * 100)
      : 0

    // Pending tasks (workspace-wide for this user)
    const { data: pending } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)

    const pendingForUser = ((pending || []) as { id: string }[]).length

    const report = {
      id: `computed-${userId}-${targetMonth}-${targetYear}`,
      workspace_id: workspaceId,
      user_id: userId,
      report_type: 'monthly',
      period_start: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
      period_end: `${targetYear}-${String(targetMonth).padStart(2, '0')}-30`,
      month: targetMonth,
      year: targetYear,
      tasks_completed: userTasks.length,
      tasks_delayed: delayed.length,
      tasks_pending: pendingForUser,
      on_time_rate: onTimeRate,
      avg_hours_per_task: null,
      summary: `Resumen ${targetMonth}/${targetYear}: ${userTasks.length} tareas completadas, ${onTimeRate}% a tiempo`,
    }

    return NextResponse.json({ data: [report] })
  } catch (err) {
    console.error('Error in GET /api/performance/reports:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()
    const now = new Date()
    const targetMonth = body.month || (now.getMonth() + 1)
    const targetYear = body.year || now.getFullYear()
    const userId = body.user_id

    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00`
    const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1
    const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, deadline, clientId, createdById, assignedTo, updatedAt')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .gte('updatedAt', monthStart)
      .lt('updatedAt', monthEnd)
      .limit(500)

    const userTasks = ((tasks || []) as TaskRow[]).filter(t => isUserTask(t, userId))
    const delayed = userTasks.filter(t => !computeWasOnTime(t))
    const onTimeRate = userTasks.length > 0
      ? Math.round(((userTasks.length - delayed.length) / userTasks.length) * 100)
      : 0

    const { data: pending } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)

    const report = {
      id: `computed-${userId}-${targetMonth}-${targetYear}`,
      workspace_id: workspaceId,
      user_id: userId,
      report_type: 'monthly',
      period_start: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
      period_end: `${targetYear}-${String(targetMonth).padStart(2, '0')}-30`,
      month: targetMonth,
      year: targetYear,
      tasks_completed: userTasks.length,
      tasks_delayed: delayed.length,
      tasks_pending: (pending || []).length,
      on_time_rate: onTimeRate,
      avg_hours_per_task: null,
      summary: body.summary || `${userTasks.length} tareas completadas en ${targetMonth}/${targetYear}, ${onTimeRate}% a tiempo`,
      strengths: body.strengths || null,
      improvement_areas: body.improvement_areas || null,
    }

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/performance/reports:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
