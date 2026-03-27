import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role, userId } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (role === 'member') {
      query = query.eq('assignee_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in GET /api/tasks:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        project_id: body.project_id || null,
        parent_task_id: body.parent_task_id || null,
        title: body.title,
        description: body.description || null,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        assignee_id: body.assignee_id || null,
        due_date: body.due_date || null,
        estimated_hours: body.estimated_hours || null,
        actual_hours: body.actual_hours || null,
        tags: body.tags || null,
        position: body.position ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If role is member, notify the workspace owner
    if (role === 'member') {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single()

      if (workspace?.owner_id) {
        await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          user_id: workspace.owner_id,
          title: 'Nueva tarea creada',
          message: `El miembro ${userId} creó la tarea: ${body.title}`,
          type: 'task',
          read: false,
          link: `/projects/${body.project_id || ''}`,
        })
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/tasks:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
