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
      .eq('parentTaskId', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    return NextResponse.json({ ...task, subtasks: subtasks || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Map from frontend field names to actual DB column names (table uses camelCase)
const FIELD_MAP: Record<string, string> = {
  due_date: 'deadline',
  client_id: 'clientId',
  project_id: 'projectId',
  actual_hours: 'actualHours',
  estimated_hours: 'estimatedHours',
  parent_task_id: 'parentTaskId',
}

const ALLOWED_FIELDS = [
  'title', 'description', 'status', 'priority',
  'deadline', 'due_date',
  'assignee_id', 'assignedTo',
  'clientId', 'client_id',
  'projectId', 'project_id',
  'tags', 'notes',
  'estimatedHours', 'estimated_hours',
  'actualHours', 'actual_hours',
  'position', 'parentTaskId', 'parent_task_id',
  'progressPercent', 'department', 'taskType',
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
      .select('status, deadline, projectId, title, assignee_id, assignedTo')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    // Build update data — DB columns are camelCase
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        const dbField = FIELD_MAP[field] || field
        if (field === 'assignedTo') {
          // Store array in assignedTo AND first item in assignee_id for compatibility
          const arr = Array.isArray(body[field]) ? body[field] : [body[field]].filter(Boolean)
          updateData.assignedTo = arr
          updateData.assignee_id = arr[0] || null
        } else if (field === 'assignee_id') {
          updateData.assignee_id = body[field]
        } else {
          updateData[dbField] = body[field]
        }
      }
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
