import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // C2 FIX: Validate CRON_SECRET like daily-digest
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: overdueMilestones, error } = await supabase
      .from('project_milestones')
      .select('id, title, project_id, workspace_id, due_date, projects(owner_id, name)')
      .eq('completed', false)
      .lt('due_date', twoDaysAgo.toISOString())

    if (error) {
      console.error('Error checking milestones:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!overdueMilestones || overdueMilestones.length === 0) {
      return NextResponse.json({ checked: 0, notificationsCreated: 0 })
    }

    // Batch: get all existing notifications to avoid N+1
    const milestoneIds = overdueMilestones.map(m => m.id)
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('message')
      .eq('type', 'milestone')

    const existingMilestoneIds = new Set(
      (existingNotifs || [])
        .map(n => milestoneIds.find(id => n.message?.includes(id)))
        .filter(Boolean)
    )

    // Batch insert new notifications
    const toInsert = []
    for (const milestone of overdueMilestones) {
      if (existingMilestoneIds.has(milestone.id)) continue

      const projects = milestone.projects as { owner_id: string; name: string }[] | null
      const project = projects?.[0] ?? null
      if (!project?.owner_id) continue

      toInsert.push({
        workspace_id: milestone.workspace_id,
        user_id: project.owner_id,
        title: 'Milestone atrasado',
        message: `El milestone "${milestone.title}" del proyecto "${project.name}" esta atrasado. (${milestone.id})`,
        type: 'milestone',
        read: false,
        link: `/projects/${milestone.project_id}`,
      })
    }

    if (toInsert.length > 0) {
      await supabase.from('notifications').insert(toInsert)
    }

    return NextResponse.json({
      checked: overdueMilestones.length,
      notificationsCreated: toInsert.length,
    })
  } catch (err) {
    console.error('Error in GET /api/cron/check-milestones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
