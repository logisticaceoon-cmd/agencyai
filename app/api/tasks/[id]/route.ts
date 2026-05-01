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
      .select('status, deadline, projectId, title, assignedTo')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      ...body,
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
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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

      // Create a performance entry in activity_log for each assigned user
      for (const assignedUserId of assignedUsers) {
        await supabase
          .from('activity_log')
          .insert({
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
          })
          .then(({ error: logError }) => {
            if (logError) console.error('Error auto-logging performance to activity_log:', logError)
          })
      }
    }

    // Fire notifications when assignedTo changes
    if (body.assignedTo && Array.isArray(body.assignedTo)) {
      const prevAssigned: string[] = currentTask.assignedTo || []
      const newAssigned: string[] = body.assignedTo
      const newlyAdded = newAssigned.filter((uid: string) => !prevAssigned.includes(uid))

      for (const recipientId of newlyAdded) {
        await supabase
          .from('notifications')
          .insert({
            workspace_id: workspaceId,
            user_id: recipientId,
            type: 'task_assigned',
            title: 'Nueva tarea asignada',
            message: `Se te asignó: ${currentTask.title}`,
            data: { taskId: id, taskTitle: currentTask.title },
            read: false,
          })
          .then(({ error: nErr }) => {
            if (nErr) console.error('Notification insert error:', nErr.message)
          })
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
