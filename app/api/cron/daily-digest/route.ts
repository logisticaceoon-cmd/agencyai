import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const workspaceId = process.env.DEFAULT_WORKSPACE_ID
    if (!workspaceId) {
      return NextResponse.json({ error: 'DEFAULT_WORKSPACE_ID not configured' }, { status: 500 })
    }

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const [completedResult, pendingResult, overdueResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'completed')
        .gte('createdAt', yesterday),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'in_progress'])
        .is('deleted_at', null),
      supabase
        .from('tasks')
        .select('title, deadline')
        .eq('workspace_id', workspaceId)
        .not('deadline', 'is', null)
        .lt('deadline', now.toISOString())
        .in('status', ['pending', 'in_progress'])
        .is('deleted_at', null)
        .limit(10),
    ])

    return NextResponse.json({
      success: true,
      completedTasks: completedResult.count || 0,
      pendingTasks: pendingResult.count || 0,
      overdueTasks: overdueResult.data?.length || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
