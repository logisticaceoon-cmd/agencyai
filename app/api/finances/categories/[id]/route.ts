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
    const { name, description, color, icon, position } = body

    const { data, error } = await supabase
      .from('service_categories')
      .update({ name, description, color, icon, position })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
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

    const { data: clients, error: checkError } = await supabase
      .from('finance_clients')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('category_id', id)
      .is('deleted_at', null)
      .limit(1)

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (clients && clients.length > 0) {
      return NextResponse.json(
        { error: 'La categoria tiene clientes asignados' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
