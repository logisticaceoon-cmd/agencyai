import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params
    const body = await request.json()
    const { title, platform, post_type, scheduled_date, status, description } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title.trim()
    if (platform !== undefined) updates.platform = platform
    if (post_type !== undefined) updates.post_type = post_type
    if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date || null
    if (status !== undefined) updates.status = status
    if (description !== undefined) updates.description = description?.trim() || null

    const { data, error } = await supabase
      .from('content_items')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('PATCH /api/content/[id] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params

    const { error } = await supabase
      .from('content_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/content/[id] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
