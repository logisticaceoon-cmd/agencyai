import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { taskToPhase } from '@/lib/task-to-phase'
import type { Phase } from '@/lib/task-to-phase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId } = await params

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('projectId', projectId)
      .eq('workspace_id', workspaceId)
      .eq('taskType', 'phase')
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    const phases = (data || []).map(taskToPhase)
    return NextResponse.json({ data: phases })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth
    const { id: projectId } = await params

    const body = await request.json()
    if (!body.title) {
      return NextResponse.json({ error: 'title es requerido' }, { status: 400 })
    }

    // Get current phase count for ordering
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('projectId', projectId)
      .eq('workspace_id', workspaceId)
      .eq('taskType', 'phase')
      .is('deleted_at', null)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        projectId,
        title: body.title,
        description: body.description || null,
        deadline: body.deadline || null,
        assignedTo: body.responsible_id || null,
        assignee_id: body.responsible_id || null,
        status: body.status === 'completed' ? 'completed' : body.status === 'in_progress' ? 'in_progress' : 'pending',
        taskType: 'phase',
        priority: body.priority || 'medium',
        position: count || 0,
        createdById: userId,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Notify if deadline is within 3 days
    if (data?.deadline) {
      const daysLeft = Math.ceil((new Date(data.deadline).getTime() - Date.now()) / 86400000)
      if (daysLeft <= 3 && daysLeft > 0) {
        try {
          await supabase.from('notifications').insert({
            workspace_id: workspaceId,
            title: `Fase próxima a vencer: ${data.title}`,
            message: `La fase "${data.title}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
            type: 'warning',
            read: false,
          })
        } catch (notifErr) {
          console.error('Failed to insert phase notification:', notifErr)
        }
      }
    }

    return NextResponse.json({ data: taskToPhase(data) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
