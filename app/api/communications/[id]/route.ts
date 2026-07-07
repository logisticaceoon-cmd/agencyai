import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('client_interactions')
      .select('*, clients(id, name)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Communication GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.summary !== undefined) updates.summary = body.summary
    if (body.outcome !== undefined) updates.outcome = body.outcome
    if (body.next_action !== undefined) updates.next_action = body.next_action
    if (body.type !== undefined) updates.type = body.type
    if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes
    if (body.date !== undefined) updates.date = body.date

    const { data, error } = await supabase
      .from('client_interactions')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name)')
      .single()

    if (error) {
      console.error('Error updating communication:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Communication PATCH error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase
      .from('client_interactions')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Error deleting communication:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Communication DELETE error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
