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

    const [
      { data: project, error: projectError },
      { data: tasks },
      { data: milestones },
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select('*')
        .eq('projectId', id)
        .eq('workspace_id', workspaceId)
        .order('createdAt', { ascending: true }),
      supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', id)
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true }),
    ])

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Calculate progress
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter((t: { status: string }) => t.status === 'done').length || 0
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return NextResponse.json({
      ...project,
      tasks: tasks || [],
      milestones: milestones || [],
      progress,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
    })
  } catch (err) {
    console.error('Error in GET /api/projects/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const body = await request.json()

    // C4 FIX: Whitelist fields to prevent privilege escalation
    const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const safeFields = ['name', 'description', 'status', 'priority', 'start_date', 'end_date',
      'budget', 'client_id', 'service_type', 'notes', 'tags', 'color']
    for (const field of safeFields) {
      if (body[field] !== undefined) allowed[field] = body[field]
    }

    const { data, error } = await supabase
      .from('projects')
      .update(allowed)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error || !data) {
      console.error('Error updating project:', error)
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PUT /api/projects/[id]:', err)
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
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/projects/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
