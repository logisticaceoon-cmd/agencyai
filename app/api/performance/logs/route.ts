import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// This route now just redirects to the main performance endpoint
// Kept for backwards compatibility
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const month = parseInt(searchParams.get('month') || '0')
    const year = parseInt(searchParams.get('year') || '0')

    if (!month || !year) {
      return NextResponse.json({ data: [] })
    }

    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 1).toISOString()

    let query = supabase
      .from('tasks')
      .select('id, title, status, assignee_id, due_date, completed_at, created_at, project_id, projects(name)')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .eq('status', 'completed')
      .gte('completed_at', startOfMonth)
      .lt('completed_at', endOfMonth)
      .order('completed_at', { ascending: false })

    if (userId) {
      query = query.eq('assignee_id', userId)
    }

    const { data } = await query

    const rows = (data || []).map(t => {
      const completedDate = new Date(t.completed_at!)
      const dueDate = t.due_date ? new Date(t.due_date + 'T23:59:59') : null
      const wasOnTime = !dueDate || completedDate <= dueDate
      const delayHours = !wasOnTime && dueDate
        ? Math.round((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60))
        : null

      return {
        id: t.id,
        title: t.title,
        project_name: (t.projects as unknown as { name: string } | null)?.name || null,
        status: 'completed',
        was_on_time: wasOnTime,
        delay_hours: delayHours,
        completed_at: t.completed_at,
        created_at: t.created_at,
      }
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
