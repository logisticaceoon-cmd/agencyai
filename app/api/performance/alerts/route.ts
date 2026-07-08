import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    // Find tasks with deadline passed by >48h and not completed
    const deadline48hAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, assignee_id, project_id, priority, updated_at')
      .eq('workspace_id', workspaceId)
      .lt('due_date', deadline48hAgo)
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'rejected')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      console.warn('Error fetching overdue tasks:', error)
      return NextResponse.json({ data: [], count: 0, critical: 0 })
    }

    const now = new Date()
    const enriched = (overdueTasks || []).map((task) => {
      const dueDate = new Date(task.due_date)
      const delayHours = Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60))
      return {
        ...task,
        delay_hours: delayHours,
        delay_days: Math.round(delayHours / 24),
        severity: delayHours > 168 ? 'critical' : delayHours > 72 ? 'high' : 'medium' as string,
      }
    })

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
      critical: enriched.filter(t => t.severity === 'critical').length,
    })
  } catch (err) {
    console.error('Error in GET /api/performance/alerts:', err)
    return NextResponse.json({ data: [], count: 0, critical: 0 })
  }
}
