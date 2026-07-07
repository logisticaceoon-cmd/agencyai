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
      .select('status, deadline, projectId, title, assignedTo')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'due_date', 'deadline', 'assignedTo', 'client_id', 'clientId', 'project_id', 'projectId', 'tags', 'notes', 'estimated_hours', 'actual_hours', 'actualHours', 'category', 'position', 'parent_task_id']
    const sanitizedBody: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) sanitizedBody[field] = body[field]
    }

    const updateData: Record<string, unknown> = {
      ...sanitizedBody,
      updatedAt: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
    }

    // Auto-log bitácora entry when task is completed
    if (body.status === 'completed' && currentTask.status !== 'completed') {
      const completedTask = data
      const assignedUsers: string[] = completedTask.assignedTo || []

      // Check if task was on time
      let wasOnTime = true
      let delayHours: number | null = null
      if (completedTask.deadline) {
        const deadline = new Date(completedTask.deadline)
        const now = new Date()
        if (now > deadline) {
          wasOnTime = false
          delayHours = Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60))
        }
      }

      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // Bulk insert performance entries for all assigned users
      if (assignedUsers.length > 0) {
        const activityEntries = assignedUsers.map(assignedUserId => ({
          id: crypto.randomUUID(),
          organizationId: workspaceId,
          userId: assignedUserId,
          taskId: id,
          actionType: 'performance_task_completed',
          entityType: 'task',
          entityId: id,
          description: `Tarea completada: ${completedTask.title}`,
          changes: {
            wasOnTime,
            delayHours,
            hoursSpent: completedTask.actualHours || null,
            clientId: completedTask.clientId || null,
            month: currentMonth,
            year: currentYear,
            title: `Tarea completada: ${completedTask.title}`,
          },
        }))
        await supabase.from('activity_log').insert(activityEntries)
      }
    }

    // Fire notifications when assignedTo changes (bulk insert)
    if (sanitizedBody.assignedTo && Array.isArray(sanitizedBody.assignedTo)) {
      const prevAssigned: string[] = currentTask.assignedTo || []
      const newAssigned: string[] = sanitizedBody.assignedTo as string[]
      const newlyAdded = newAssigned.filter((uid: string) => !prevAssigned.includes(uid))

      if (newlyAdded.length > 0) {
        const notifEntries = newlyAdded.map(recipientId => ({
          workspace_id: workspaceId,
          user_id: recipientId,
          type: 'task_assigned',
          title: 'Nueva tarea asignada',
          message: `Se te asignó: ${currentTask.title}`,
          data: { taskId: id, taskTitle: currentTask.title },
          read: false,
        }))
        await supabase.from('notifications').insert(notifEntries)
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
