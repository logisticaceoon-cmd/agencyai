import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!task) return NextResponse.json({ data: [] })

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('taskId', id)
      .order('createdAt', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, fullName } = auth

    const { data: task } = await supabase
      .from('tasks')
      .select('id, title, assignedTo')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })

    const { data, error } = await supabase
      .from('comments')
      .insert({
        text,
        authorId: userId,
        authorName: fullName || 'Usuario',
        taskId: id,
        workspace_id: workspaceId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting comment:', error)
      return NextResponse.json({ error: 'Error en la solicitud' }, { status: 400 })
    }

    // Notify task assignees (except the commenter)
    const assignees: string[] = task.assignedTo || []
    const toNotify = assignees.filter((uid: string) => uid !== userId)
    for (const recipientId of toNotify) {
      await supabase
        .from('notifications')
        .insert({
          workspace_id: workspaceId,
          user_id: recipientId,
          type: 'task_comment',
          title: 'Nuevo comentario en tarea',
          message: `${fullName || 'Alguien'} comentó en: ${task.title}`,
          data: { taskId: id, taskTitle: task.title },
          read: false,
        })
        .then(({ error: nErr }) => {
          if (nErr) console.error('Notification error:', nErr.message)
        })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
