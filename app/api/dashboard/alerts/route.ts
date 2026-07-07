import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [tasksResult, reportsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, deadline, assignee_id, priority')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .lt('deadline', now)
        .in('status', ['pending', 'in_progress'])
        .order('deadline', { ascending: true })
        .limit(10),
      supabase
        .from('reports')
        .select('id, title, createdAt')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .lt('createdAt', yesterday)
        .limit(10),
    ])

    return NextResponse.json({
      overdueTasks: tasksResult.data || [],
      pendingReports: reportsResult.data || [],
      overdueReportsCount: reportsResult.data?.length || 0,
    })
  } catch (err) {
    console.error('Error fetching dashboard alerts:', err)
    return NextResponse.json({ overdueTasks: [], pendingReports: [], overdueReportsCount: 0 })
  }
}
