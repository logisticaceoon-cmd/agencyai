import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import { sanitizeError } from '@/lib/sanitize-error'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const assignedTo = searchParams.get('assigned_to')
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('tasks')
      .select('id, title, description, status, priority, deadline, createdAt, clientId, projectId, assignedTo, createdById')
      .eq('workspace_id', organizationId)
      .is('deleted_at', null)
      .order('deadline', { ascending: true })
      .limit(200)

    if (date) {
      query = query
        .gte('deadline', `${date}T00:00:00Z`)
        .lte('deadline', `${date}T23:59:59Z`)
    }
    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('clientId', clientId)
    if (projectId) query = query.eq('projectId', projectId)
    if (assignedTo) query = query.contains('assignedTo', [assignedTo])

    const { data, error } = await query

    if (error) {
      console.error('Cowork tasks GET error:', error)
      return NextResponse.json({ error: sanitizeError(error, 'GET /api/cowork/tasks') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { tasks: data || [], total: data?.length || 0 },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork tasks GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId, userId } = auth

    const body = await request.json()

    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Resolver createdById: use authenticated userId, fallback to body or workspace owner
    let createdById = userId || body.created_by || body.createdById || null

    if (!createdById) {
      const { data: ownerData } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', organizationId)
        .eq('role', 'owner')
        .single()
      createdById = ownerData?.user_id || null
    }

    // Accept both snake_case and camelCase for assignedTo
    const assignedTo = body.assigned_to || body.assignedTo || []

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: organizationId,
        title: body.title,
        description: body.description || null,
        clientId: body.client_id || null,
        projectId: body.project_id || body.projectId || null,
        parentTaskId: body.parent_task_id || body.parentTaskId || null,
        assignedTo,
        deadline: body.deadline || null,
        priority: body.priority || 'medium',
        status: body.status || 'pending',
        createdById,
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork tasks POST error:', error)
      return NextResponse.json({ error: sanitizeError(error, 'POST /api/cowork/tasks') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { task: data, message: 'Task created successfully from Cowork' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork tasks POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')
    const body = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.deadline !== undefined) updateData.deadline = body.deadline
    if (body.assigned_to !== undefined) updateData.assignedTo = body.assigned_to
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'PATCH /api/cowork/tasks') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { task: data, message: 'Task updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork tasks PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
