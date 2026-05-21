import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

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

function getCompletedAt(task: TaskRow) {
  return new Date(task.updatedAt || task.createdAt)
}

function wasOnTime(task: TaskRow) {
  if (!task.deadline) return true
  return getCompletedAt(task) <= new Date(task.deadline)
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

    // Completed tasks assigned to this user in the given month/year (filter by updatedAt)
    const { data: allCompleted } = await supabase
      .from('tasks')
      .select('id, title, status, createdById, assignedTo, deadline, createdAt, updatedAt, clientId')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .contains('assignedTo', [userId])
      .is('deleted_at', null)
      .limit(500)

    const userCompleted = ((allCompleted || []) as TaskRow[]).filter(t => {
      const d = getCompletedAt(t)
      return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear
    })

    const delayed = userCompleted.filter(t => !wasOnTime(t))
    const onTimeRate = userCompleted.length > 0
      ? Math.round(((userCompleted.length - delayed.length) / userCompleted.length) * 100)
      : 0

    // Pending tasks assigned to this user (current state, no month filter)
    const { data: pending } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .contains('assignedTo', [userId])
      .is('deleted_at', null)
      .in('status', ['pending', 'in_progress'])

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
      tasks_completed: userCompleted.length,
      tasks_delayed: delayed.length,
      tasks_pending: pendingForUser,
      on_time_rate: onTimeRate,
      avg_hours_per_task: null,
      summary: `Resumen ${targetMonth}/${targetYear}: ${userCompleted.length} tareas completadas, ${onTimeRate}% a tiempo`,
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

    const { data: allCompleted } = await supabase
      .from('tasks')
      .select('id, title, status, createdById, assignedTo, deadline, createdAt, updatedAt, clientId')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .contains('assignedTo', [userId])
      .is('deleted_at', null)
      .limit(500)

    const userCompleted = ((allCompleted || []) as TaskRow[]).filter(t => {
      const d = new Date(t.updatedAt || t.createdAt)
      return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear
    })

    const delayed = userCompleted.filter(t => {
      if (!t.deadline) return false
      return new Date(t.updatedAt || t.createdAt) > new Date(t.deadline)
    })
    const onTimeRate = userCompleted.length > 0
      ? Math.round(((userCompleted.length - delayed.length) / userCompleted.length) * 100)
      : 0

    const report = {
      id: `computed-${userId}-${targetMonth}-${targetYear}`,
      workspace_id: workspaceId,
      user_id: userId,
      report_type: 'monthly',
      period_start: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
      period_end: `${targetYear}-${String(targetMonth).padStart(2, '0')}-30`,
      month: targetMonth,
      year: targetYear,
      tasks_completed: userCompleted.length,
      tasks_delayed: delayed.length,
      tasks_pending: 0,
      on_time_rate: onTimeRate,
      avg_hours_per_task: null,
      summary: body.summary || `${userCompleted.length} tareas completadas en ${targetMonth}/${targetYear}, ${onTimeRate}% a tiempo`,
      strengths: body.strengths || null,
      improvement_areas: body.improvement_areas || null,
    }

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/performance/reports:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
