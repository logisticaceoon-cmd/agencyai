import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('project_id') || searchParams.get('projectId')
    const parentTaskId = searchParams.get('parent_task_id') || searchParams.get('parentTaskId')

    const appRole = normalizeRole(role)
    const scope = getDataScope('tasks', appRole)

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .limit(500)
      .order('createdAt', { ascending: true })

    // Filtrar por asignado si el rol no tiene acceso total
    if (scope === 'assigned') {
      query = query.contains('assignedTo', [userId])
    }

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (projectId) {
      // Dentro de un proyecto: mostrar todas las tareas de ese proyecto
      query = query.eq('projectId', projectId)
    } else if (!parentTaskId) {
      // Vista global de Tareas: solo tareas sueltas (sin proyecto asignado)
      query = query.is('projectId', null)
    }
    if (parentTaskId) query = query.eq('parentTaskId', parentTaskId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/tasks:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        projectId: body.projectId || body.project_id || null,
        parentTaskId: body.parentTaskId || body.parent_task_id || null,
        title: body.title,
        description: body.description || null,
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        deadline: body.deadline || body.due_date || null,
        assignedTo: body.assignedTo || [],
        createdById: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/tasks:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
