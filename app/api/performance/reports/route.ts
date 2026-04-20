import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// Reports se calculan en tiempo real desde activity_log (no se persisten en tabla separada)

type ActivityLogRow = {
  id: string
  userId: string
  organizationId: string
  taskId?: string | null
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

    if (!userId || !month || !year) {
      return NextResponse.json({ data: [] })
    }

    // Fetch logs from activity_log
    const { data: logs } = await supabase
      .from('activity_log')
      .select('*')
      .eq('organizationId', workspaceId)
      .eq('userId', userId)
      .eq('actionType', 'performance_task_completed')

    const allLogs = ((logs || []) as ActivityLogRow[]).filter(row => {
      const c = row.changes || {}
      return (c as Record<string, unknown>).month === parseInt(month) &&
             (c as Record<string, unknown>).year === parseInt(year)
    })

    const delayed = allLogs.filter(r => (r.changes as Record<string, unknown>)?.wasOnTime === false)
    const onTimeRate = allLogs.length > 0
      ? Math.round(((allLogs.length - delayed.length) / allLogs.length) * 100)
      : 0

    const withHours = allLogs.filter(r => (r.changes as Record<string, unknown>)?.hoursSpent)
    const avgHours = withHours.length > 0
      ? withHours.reduce((sum, r) => sum + Number((r.changes as Record<string, unknown>).hoursSpent || 0), 0) / withHours.length
      : null

    const { data: pending } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .contains('assignedTo', [userId])
      .in('status', ['pending', 'in_progress'])

    const targetMonth = parseInt(month)
    const targetYear = parseInt(year)
    const report = {
      id: `computed-${userId}-${targetMonth}-${targetYear}`,
      workspace_id: workspaceId,
      user_id: userId,
      report_type: 'monthly',
      period_start: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
      period_end: `${targetYear}-${String(targetMonth).padStart(2, '0')}-30`,
      month: targetMonth,
      year: targetYear,
      tasks_completed: allLogs.length,
      tasks_delayed: delayed.length,
      tasks_pending: pending?.length || 0,
      on_time_rate: onTimeRate,
      avg_hours_per_task: avgHours,
      summary: `Resumen ${targetMonth}/${targetYear}: ${allLogs.length} tareas completadas, ${onTimeRate}% a tiempo`,
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

    // Calculate from activity_log
    const { data: logs } = await supabase
      .from('activity_log')
      .select('*')
      .eq('organizationId', workspaceId)
      .eq('userId', userId)
      .eq('actionType', 'performance_task_completed')

    const periodLogs = ((logs || []) as ActivityLogRow[]).filter(row => {
      const c = (row.changes || {}) as Record<string, unknown>
      return c.month === targetMonth && c.year === targetYear
    })

    const delayed = periodLogs.filter(r => (r.changes as Record<string, unknown>)?.wasOnTime === false)
    const onTimeRate = periodLogs.length > 0
      ? Math.round(((periodLogs.length - delayed.length) / periodLogs.length) * 100)
      : 0

    const withHours = periodLogs.filter(r => (r.changes as Record<string, unknown>)?.hoursSpent)
    const avgHours = withHours.length > 0
      ? withHours.reduce((sum, r) => sum + Number((r.changes as Record<string, unknown>).hoursSpent || 0), 0) / withHours.length
      : null

    const { data: pending } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .contains('assignedTo', [userId])
      .in('status', ['pending', 'in_progress'])

    const report = {
      id: `computed-${userId}-${targetMonth}-${targetYear}`,
      workspace_id: workspaceId,
      user_id: userId,
      report_type: 'monthly',
      period_start: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
      period_end: `${targetYear}-${String(targetMonth).padStart(2, '0')}-30`,
      month: targetMonth,
      year: targetYear,
      tasks_completed: periodLogs.length,
      tasks_delayed: delayed.length,
      tasks_pending: pending?.length || 0,
      on_time_rate: onTimeRate,
      avg_hours_per_task: avgHours,
      summary: body.summary || `${periodLogs.length} tareas completadas en ${targetMonth}/${targetYear}, ${onTimeRate}% a tiempo`,
      strengths: body.strengths || null,
      improvement_areas: body.improvement_areas || null,
    }

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/performance/reports:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
