import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth
    const { id } = await params
    const body = await request.json()

    // Fetch template
    const { data: template, error: tplError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (tplError || !template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Create main task
    const { data: mainTask, error: mainError } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title: template.name,
        description: template.description || null,
        status: 'pending',
        priority: 'medium',
        assignedTo: userId ? [userId] : [],
        estimatedHours: template.estimated_hours || null,
        tags: template.tags || [],
        clientId: body.client_id || null,
        projectId: body.project_id || null,
        createdById: userId,
      })
      .select()
      .single()

    if (mainError || !mainTask) {
      return NextResponse.json({ error: 'Error al crear tarea principal' }, { status: 500 })
    }

    // Create subtasks from template
    const subtasks = (template.subtasks || []) as Array<{ title: string; description?: string }>
    const createdSubtasks = []

    for (const sub of subtasks) {
      const { data: subTask } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          title: sub.title,
          description: sub.description || null,
          status: 'pending',
          priority: 'medium',
          assignedTo: userId ? [userId] : [],
          parentTaskId: mainTask.id,
          clientId: body.client_id || null,
          projectId: body.project_id || null,
          createdById: userId,
        })
        .select()
        .single()

      if (subTask) createdSubtasks.push(subTask)
    }

    return NextResponse.json({
      data: {
        task: mainTask,
        subtasks: createdSubtasks,
        total: 1 + createdSubtasks.length,
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
