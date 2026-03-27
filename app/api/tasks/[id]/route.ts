import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    // Fetch subtasks
    const { data: subtasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    return NextResponse.json({ ...task, subtasks: subtasks || [] })
  } catch (err) {
    console.error('Error in GET /api/tasks/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const body = await request.json()

    // Get current task to check status change
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('status, due_date, assignee_id, project_id, title')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If status changed to 'done' and the task was overdue, notify
    if (body.status === 'done' && currentTask.status !== 'done') {
      const dueDate = currentTask.due_date ? new Date(currentTask.due_date) : null
      const now = new Date()

      if (dueDate && dueDate < now) {
        // Task was overdue when completed - notify project owner
        if (currentTask.project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', currentTask.project_id)
            .single()

          if (project?.owner_id) {
            await supabase.from('notifications').insert({
              workspace_id: workspaceId,
              user_id: project.owner_id,
              title: 'Tarea atrasada completada',
              message: `La tarea "${currentTask.title}" fue completada después de la fecha límite.`,
              type: 'task',
              read: false,
              link: `/projects/${currentTask.project_id}`,
            })
          }
        }
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PATCH /api/tasks/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/tasks/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
