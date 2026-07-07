import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.target_value !== undefined) updates.target_value = body.target_value
    if (body.current_value !== undefined) updates.current_value = body.current_value
    if (body.unit !== undefined) updates.unit = body.unit
    if (body.color !== undefined) updates.color = body.color

    const { data, error } = await supabase
      .from('kpis')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name)')
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  const { error } = await supabase.from('kpis').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
