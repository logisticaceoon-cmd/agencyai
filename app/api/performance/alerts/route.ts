import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    // Find tasks with deadline passed by >48h and not completed
    const deadline48hAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, deadline, assignedTo, clientId, priority, updatedAt')
      .eq('workspace_id', workspaceId)
      .lt('deadline', deadline48hAgo)
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'rejected')
      .is('deleted_at', null)
      .order('deadline', { ascending: true })

    if (error) {
      console.warn('Error fetching overdue tasks:', error)
      return NextResponse.json({ data: [], count: 0, critical: 0 })
    }

    // Enrich with delay info
    const now = new Date()
    const enriched = (overdueTasks || []).map((task: { deadline: string | number | Date }) => {
      const deadline = new Date(task.deadline)
      const delayHours = Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60))
      return {
        ...task,
        delay_hours: delayHours,
        delay_days: Math.round(delayHours / 24),
        severity: delayHours > 168 ? 'critical' : delayHours > 72 ? 'high' : 'medium',
      }
    })

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
      critical: enriched.filter((t: { severity: string }) => t.severity === 'critical').length,
    })
  } catch (err) {
    console.error('Error in GET /api/performance/alerts:', err)
    return NextResponse.json({ data: [], count: 0, critical: 0 })
  }
}
