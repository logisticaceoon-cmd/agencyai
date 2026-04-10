import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

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

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updateData.title = body.title
    if (body.url !== undefined) updateData.url = body.url
    if (body.description !== undefined) updateData.description = body.description
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.color !== undefined) updateData.color = body.color
    if (body.category !== undefined) updateData.category = body.category
    if (body.client_id !== undefined) updateData.client_id = body.client_id || null
    if (body.project_id !== undefined) updateData.project_id = body.project_id || null
    if (body.pinned !== undefined) updateData.pinned = body.pinned

    const { data, error } = await supabase
      .from('bookmarks')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
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

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
