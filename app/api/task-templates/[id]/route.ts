import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.subtasks !== undefined) updates.subtasks = body.subtasks
    if (body.default_assignee_role !== undefined) updates.default_assignee_role = body.default_assignee_role
    if (body.estimated_hours !== undefined) updates.estimated_hours = body.estimated_hours
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.category !== undefined) updates.category = body.category
    if (body.recurrence !== undefined) updates.recurrence = body.recurrence
    if (body.is_active !== undefined) updates.is_active = body.is_active

    const { data, error } = await supabase
      .from('task_templates')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
