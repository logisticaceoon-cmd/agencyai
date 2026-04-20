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

    let query = supabase
      .from('performance_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (userId) query = query.eq('user_id', userId)
    if (month) query = query.eq('month', parseInt(month))
    if (year) query = query.eq('year', parseInt(year))

    const { data, error } = await query

    if (error) {
      // Table may not exist yet
      console.warn('Error fetching performance logs:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
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
      .from('performance_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: body.user_id,
        task_id: body.task_id || null,
        client_id: body.client_id || null,
        action_type: body.action_type || 'task_completed',
        title: body.title,
        description: body.description || null,
        hours_spent: body.hours_spent || null,
        delay_hours: body.delay_hours || null,
        was_on_time: body.was_on_time !== false,
        month: body.month || (now.getMonth() + 1),
        year: body.year || now.getFullYear(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/performance/logs:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
