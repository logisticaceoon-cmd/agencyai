import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import type { Phase } from '../route'

function taskToPhase(task: any): Phase {
  return {
    id: task.id,
    title: task.title,
    description: task.description || null,
    deadline: task.deadline || null,
    responsible_id: task.assignedTo || task.assignee_id || null,
    status: task.status === 'done' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending',
    order: task.position || 0,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId, phaseId } = await params

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', phaseId)
      .eq('projectId', projectId)
      .eq('workspace_id', workspaceId)
      .eq('taskType', 'phase')
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data: taskToPhase(data) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId, phaseId } = await params

    const body = await request.json()
    const updatePayload: any = { updatedAt: new Date().toISOString() }

    if (body.title !== undefined) updatePayload.title = body.title
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.deadline !== undefined) updatePayload.deadline = body.deadline
    if (body.responsible_id !== undefined) {
      updatePayload.assignedTo = body.responsible_id
      updatePayload.assignee_id = body.responsible_id
    }
    if (body.status !== undefined) {
      updatePayload.status = body.status === 'completed' ? 'done' : body.status === 'in_progress' ? 'in_progress' : 'todo'
    }
    if (body.order !== undefined) updatePayload.position = body.order

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', phaseId)
      .eq('projectId', projectId)
      .eq('workspace_id', workspaceId)
      .eq('taskType', 'phase')
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Fase no encontrada' }, { status: 404 })
    }

    // Notify if deadline is within 3 days and not completed
    if (body.deadline && data.status !== 'done') {
      const daysLeft = Math.ceil((new Date(body.deadline).getTime() - Date.now()) / 86400000)
      if (daysLeft <= 3 && daysLeft > 0) {
        await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          title: `Fase próxima a vencer: ${data.title}`,
          message: `La fase "${data.title}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
          type: 'warning',
          read: false,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ data: taskToPhase(data) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId, phaseId } = await params

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', phaseId)
      .eq('projectId', projectId)
      .eq('workspace_id', workspaceId)
      .eq('taskType', 'phase')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
