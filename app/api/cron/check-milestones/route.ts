import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase } = auth

    // Find milestones that are overdue by more than 2 days and not completed
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: overdueMilestones, error } = await supabase
      .from('project_milestones')
      .select('id, title, project_id, workspace_id, due_date, projects(owner_id, name)')
      .eq('completed', false)
      .lt('due_date', twoDaysAgo.toISOString())

    if (error) {
      console.error('Error checking milestones:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let notificationsCreated = 0

    for (const milestone of overdueMilestones || []) {
      const projects = milestone.projects as { owner_id: string; name: string }[] | null
      const project = projects?.[0] ?? null
      if (!project?.owner_id) continue

      // Check if notification already exists to avoid duplicates
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('workspace_id', milestone.workspace_id)
        .eq('user_id', project.owner_id)
        .eq('type', 'milestone')
        .ilike('message', `%${milestone.id}%`)
        .limit(1)

      if (existing && existing.length > 0) continue

      await supabase.from('notifications').insert({
        workspace_id: milestone.workspace_id,
        user_id: project.owner_id,
        title: 'Milestone atrasado',
        message: `El milestone "${milestone.title}" del proyecto "${project.name}" está atrasado. (${milestone.id})`,
        type: 'milestone',
        read: false,
        link: `/projects/${milestone.project_id}`,
      })

      notificationsCreated++
    }

    return NextResponse.json({
      checked: overdueMilestones?.length || 0,
      notificationsCreated,
    })
  } catch (err) {
    console.error('Error in GET /api/cron/check-milestones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
