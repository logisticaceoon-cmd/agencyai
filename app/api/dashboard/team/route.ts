import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, name, role')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    if (!members || members.length === 0) {
      return NextResponse.json({ team: [] })
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('assignee_id, status, updated_at')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const teamStatus = members.map((m) => {
      let assigned = 0
      let completed = 0
      for (const t of (tasks || [])) {
        if (t.assignee_id !== m.user_id) continue
        if (t.status === 'pending' || t.status === 'in_progress') {
          assigned++
        } else if (t.status === 'completed' && t.updated_at && new Date(t.updated_at) >= sevenDaysAgo) {
          completed++
        }
      }

      const workloadPercent = Math.min(Math.round((assigned / 8) * 100), 100)
      const status =
        workloadPercent >= 95 ? 'overloaded' : workloadPercent >= 75 ? 'monitor' : 'on_track'

      return {
        user: { id: m.user_id, fullName: m.name || 'Usuario', role: m.role },
        tasksAssigned: assigned,
        tasksCompleted: completed,
        workloadPercent,
        status,
      }
    })

    return NextResponse.json({ team: teamStatus })
  } catch (err) {
    console.error('Error fetching team:', err)
    return NextResponse.json({ team: [] })
  }
}
