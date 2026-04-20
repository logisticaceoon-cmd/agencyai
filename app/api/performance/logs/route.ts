import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// Usamos activity_log (tabla existente) con actionType 'performance_task_completed'
// Los datos de rendimiento se guardan en el campo JSON 'changes'

type ActivityLogRow = {
  id: string
  userId: string
  organizationId: string
  taskId?: string | null
  actionType: string
  description?: string | null
  changes?: Record<string, unknown> | null
  createdAt: string
}

function mapToPerformanceLog(row: ActivityLogRow) {
  const c = (row.changes || {}) as Record<string, unknown>
  return {
    id: row.id,
    workspace_id: row.organizationId,
    user_id: row.userId,
    task_id: row.taskId || null,
    client_id: (c.clientId as string) || null,
    action_type: 'task_completed',
    title: (c.title as string) || row.description || 'Tarea completada',
    was_on_time: c.wasOnTime !== false,
    delay_hours: (c.delayHours as number) || null,
    hours_spent: (c.hoursSpent as number) || null,
    month: (c.month as number) || new Date(row.createdAt).getMonth() + 1,
    year: (c.year as number) || new Date(row.createdAt).getFullYear(),
    created_at: row.createdAt,
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
      .from('activity_log')
      .select('*')
      .eq('organizationId', workspaceId)
      .eq('actionType', 'performance_task_completed')
      .order('createdAt', { ascending: false })
      .limit(200)

    if (userId) query = query.eq('userId', userId)

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching activity_log for performance:', error)
      return NextResponse.json({ data: [] })
    }

    let rows = ((data || []) as ActivityLogRow[]).map(mapToPerformanceLog)

    if (month) rows = rows.filter(r => r.month === parseInt(month))
    if (year) rows = rows.filter(r => r.year === parseInt(year))

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error in GET /api/performance/logs:', err)
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

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        organizationId: workspaceId,
        userId: body.user_id,
        taskId: body.task_id || null,
        actionType: 'performance_task_completed',
        entityType: 'task',
        entityId: body.task_id || null,
        description: body.title,
        changes: {
          wasOnTime: body.was_on_time !== false,
          delayHours: body.delay_hours || null,
          hoursSpent: body.hours_spent || null,
          clientId: body.client_id || null,
          month: body.month || (now.getMonth() + 1),
          year: body.year || now.getFullYear(),
          title: body.title,
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating performance log in activity_log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: mapToPerformanceLog(data as ActivityLogRow) }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/performance/logs:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
