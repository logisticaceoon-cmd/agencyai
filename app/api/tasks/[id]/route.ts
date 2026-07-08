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
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Map from camelCase (frontend) to snake_case (DB)
const FIELD_MAP: Record<string, string> = {
  assignedTo: 'assignee_id',
  deadline: 'due_date',
  clientId: 'client_id',
  projectId: 'project_id',
  actualHours: 'actual_hours',
}

const ALLOWED_FIELDS = [
  'title', 'description', 'status', 'priority',
  'due_date', 'deadline', 'assignee_id', 'assignedTo',
  'client_id', 'clientId', 'project_id', 'projectId',
  'tags', 'notes', 'estimated_hours', 'actual_hours', 'actualHours',
  'category', 'position', 'parent_task_id',
]

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
      .select('status, due_date, project_id, title, assignee_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    // Build update data mapping camelCase → snake_case
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        const dbField = FIELD_MAP[field] || field
        // For assignedTo (array from frontend), store first user as assignee_id
        if (field === 'assignedTo') {
          const arr = Array.isArray(body[field]) ? body[field] : [body[field]]
          updateData.assignee_id = arr[0] || null
        } else {
          updateData[dbField] = body[field]
        }
      }
    }

    // Handle completed_at tracking
    const newStatus = body.status as string | undefined
    const isBecomingCompleted = newStatus === 'completed' && currentTask.status !== 'completed'
    const isLeavingCompleted = newStatus && newStatus !== 'completed' && currentTask.status === 'completed'

    if (isBecomingCompleted) {
      updateData.completed_at = new Date().toISOString()
    } else if (isLeavingCompleted) {
      updateData.completed_at = null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Task PATCH error:', error)
      return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
    }

    // Fire notification when assignee changes
    const newAssignee = body.assignedTo || body.assignee_id
    if (newAssignee) {
      const assigneeId = Array.isArray(newAssignee) ? newAssignee[0] : newAssignee
      const prevAssignee = currentTask.assignee_id
      if (assigneeId && assigneeId !== prevAssignee) {
        await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          user_id: assigneeId,
          type: 'task_assigned',
          title: 'Nueva tarea asignada',
          message: `Se te asigno: ${currentTask.title}`,
          data: { taskId: id, taskTitle: currentTask.title },
          read: false,
        })
      }
    }

    return NextResponse.json(data)
  } catch {
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
