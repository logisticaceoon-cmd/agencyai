import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

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
      return NextResponse.json({ error: `Error fetching tasks: ${error.message}` }, { status: 500 })
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
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: organizationId,
        title: body.title,
        description: body.description || null,
        clientId: body.client_id || null,
        projectId: body.project_id || null,
        assignedTo: body.assigned_to || [],
        deadline: body.deadline || null,
        priority: body.priority || 'medium',
        status: 'pending',
        createdById: body.created_by || 'cowork-api',
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork tasks POST error:', error)
      return NextResponse.json({ error: `Error creating task: ${error.message}` }, { status: 500 })
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
