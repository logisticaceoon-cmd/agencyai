import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For each project, count tasks by status
    const projectsWithTaskCounts = await Promise.all(
      (projects || []).map(async (project: Record<string, unknown>) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', project.id as string)
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null)

        type TaskRow = { status: string }
        const taskCounts = {
          total: tasks?.length || 0,
          todo: tasks?.filter((t: TaskRow) => t.status === 'todo').length || 0,
          in_progress: tasks?.filter((t: TaskRow) => t.status === 'in_progress').length || 0,
          done: tasks?.filter((t: TaskRow) => t.status === 'done').length || 0,
        }

        return { ...project, task_counts: taskCounts }
      })
    )

    return NextResponse.json(projectsWithTaskCounts)
  } catch (err) {
    console.error('Error in GET /api/projects:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        client_id: body.client_id || null,
        name: body.name,
        description: body.description || null,
        status: body.status || 'active',
        priority: body.priority || 'medium',
        color: body.color || null,
        start_date: body.start_date || null,
        due_date: body.due_date || null,
        budget: body.budget || null,
        budget_spent: body.budget_spent || 0,
        owner_id: body.owner_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/projects:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
