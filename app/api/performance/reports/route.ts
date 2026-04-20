import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const reportType = searchParams.get('type') || 'monthly'
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabase
      .from('performance_reports')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('report_type', reportType)
      .order('period_start', { ascending: false })
      .limit(20)

    if (userId) query = query.eq('user_id', userId)
    if (month) query = query.eq('month', parseInt(month))
    if (year) query = query.eq('year', parseInt(year))

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching performance reports:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
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

    // Auto-generate report from performance_logs if not provided
    const now = new Date()
    const targetMonth = body.month || (now.getMonth() + 1)
    const targetYear = body.year || now.getFullYear()
    const userId = body.user_id

    // Fetch logs for this period to calculate stats
    const { data: logs } = await supabase
      .from('performance_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('month', targetMonth)
      .eq('year', targetYear)
      .eq('action_type', 'task_completed')

    const completedLogs = logs || []
    const delayedLogs = completedLogs.filter((l: { was_on_time: boolean }) => !l.was_on_time)
    const onTimeRate = completedLogs.length > 0
      ? Math.round(((completedLogs.length - delayedLogs.length) / completedLogs.length) * 100)
      : 0

    // Calculate avg hours
    const logsWithHours = completedLogs.filter((l: { hours_spent: unknown }) => l.hours_spent)
    const avgHours = logsWithHours.length > 0
      ? logsWithHours.reduce((sum: number, l: { hours_spent: number }) => sum + Number(l.hours_spent), 0) / logsWithHours.length
      : null

    // Count pending tasks from tasks table
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .contains('assignedTo', [userId])
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)

    const periodStart = body.period_start || `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const periodEnd = body.period_end || `${targetYear}-${String(targetMonth).padStart(2, '0')}-30`

    const { data, error } = await supabase
      .from('performance_reports')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        report_type: body.report_type || 'monthly',
        period_start: periodStart,
        period_end: periodEnd,
        month: targetMonth,
        year: targetYear,
        tasks_completed: completedLogs.length,
        tasks_delayed: delayedLogs.length,
        tasks_pending: pendingTasks?.length || 0,
        on_time_rate: onTimeRate,
        avg_hours_per_task: avgHours,
        summary: body.summary || `Resumen de rendimiento ${targetMonth}/${targetYear}`,
        strengths: body.strengths || null,
        improvement_areas: body.improvement_areas || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/performance/reports:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
