import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('assets')
      .select('*, clients(id, name), projects(id, name)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Asset GET error:', err)
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
    if (body.name !== undefined) updates.name = body.name
    if (body.category !== undefined) updates.category = body.category
    if (body.client_id !== undefined) updates.client_id = body.client_id || null
    if (body.project_id !== undefined) updates.project_id = body.project_id || null
    if (body.tags !== undefined) updates.tags = body.tags

    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name), projects(id, name)')
      .single()

    if (error) {
      console.error('Error updating asset:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Asset PATCH error:', err)
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
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Error deleting asset:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Asset DELETE error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
