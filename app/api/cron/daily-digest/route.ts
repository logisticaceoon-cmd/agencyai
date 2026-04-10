import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const [completedResult, pendingResult, overdueResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', yesterday),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress'])
        .is('deleted_at', null),
      supabase
        .from('tasks')
        .select('title, due_date')
        .lt('due_date', now.toISOString())
        .in('status', ['pending', 'in_progress'])
        .is('deleted_at', null)
        .limit(10),
    ])

    // For now, just log the digest (Resend integration can be added later)
    console.log('Daily digest:', {
      completedTasks: completedResult.count || 0,
      pendingTasks: pendingResult.count || 0,
      overdueTasks: overdueResult.data?.length || 0,
    })

    return NextResponse.json({
      success: true,
      completedTasks: completedResult.count || 0,
      pendingTasks: pendingResult.count || 0,
      overdueTasks: overdueResult.data?.length || 0,
    })
  } catch (error) {
    console.error('Daily digest error:', error)
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
