import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Error al cargar plantillas' }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        workspace_id: workspaceId,
        name: body.name.trim(),
        description: body.description || null,
        subtasks: body.subtasks || [],
        default_assignee_role: body.default_assignee_role || null,
        estimated_hours: body.estimated_hours || null,
        tags: body.tags || [],
        category: body.category || 'general',
        recurrence: body.recurrence || 'none',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
