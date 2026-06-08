import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

// ─── Helper: auto-log performance when task is completed ─────────────────────
async function logPerformance(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  organizationId: string,
  task: Record<string, unknown>
) {
  try {
    const now = new Date()
    const deadline = task.deadline ? new Date(task.deadline as string) : null
    const wasOnTime = !deadline || deadline >= now
    const delayHours = wasOnTime || !deadline
      ? null
      : Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60))

    const assignedUsers: string[] = Array.isArray(task.assignedTo) && task.assignedTo.length > 0
      ? (task.assignedTo as string[])
      : task.createdById ? [task.createdById as string] : []

    if (assignedUsers.length === 0) return

    const inserts = assignedUsers.map((userId: string) => ({
      organizationId,
      userId,
      taskId: task.id as string,
      actionType: 'performance_task_completed',
      entityType: 'task',
      entityId: task.id as string,
      description: task.title as string,
      changes: {
        wasOnTime,
        delayHours,
        clientId: task.clientId || null,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        title: task.title,
      },
    }))

    await supabase.from('activity_log').insert(inserts)
  } catch (e) {
    console.warn('logPerformance error (non-blocking):', e)
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { task: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.deadline !== undefined) updates.deadline = body.deadline
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork task PATCH error:', error)
      return NextResponse.json({ error: `Error updating task: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Auto-log performance when task is marked completed
    if (body.status === 'completed') {
      await logPerformance(supabase, organizationId, data as Record<string, unknown>)
    }

    return NextResponse.json({
      success: true,
      data: { task: data, message: 'Task updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    // Fetch task before deleting (to log performance if completed)
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // If completed and not yet logged → save performance data before deleting
    if (task.status === 'completed') {
      const { data: existingLog } = await supabase
        .from('activity_log')
        .select('id')
        .eq('taskId', id)
        .eq('actionType', 'performance_task_completed')
        .limit(1)
        .single()

      if (!existingLog) {
        await logPerformance(supabase, organizationId, task as Record<string, unknown>)
      }
    }

    // Hard delete
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('workspace_id', organizationId)

    if (error) {
      console.error('Cowork task DELETE error:', error)
      return NextResponse.json({ error: `Error deleting task: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Task deleted successfully', taskId: id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST (legacy: action=complete) ─────────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    if (body.action !== 'complete') {
      return NextResponse.json({ error: 'Invalid action. Supported: "complete"' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Task not found or error completing' }, { status: 500 })
    }

    await logPerformance(supabase, organizationId, data as Record<string, unknown>)

    return NextResponse.json({
      success: true,
      data: { task: data, message: 'Task marked as completed' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task complete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
