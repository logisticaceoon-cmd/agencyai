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

    const { data, error } = await supabase
      .from('finance_clients')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
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
    const {
      category_id,
      client_name,
      company_name,
      assigned_to,
      contract_cost,
      commission_percent,
      commission_amount,
      currency,
      total_amount,
      cancelled_amount,
      accounts_count,
      start_date,
      status,
      observations,
      contract_pdf_url,
      contract_pdf_name,
    } = body

    const { data, error } = await supabase
      .from('finance_clients')
      .update({
        category_id,
        client_name,
        company_name,
        assigned_to,
        contract_cost,
        commission_percent,
        commission_amount,
        currency,
        total_amount,
        cancelled_amount,
        accounts_count,
        start_date,
        status,
        observations,
        contract_pdf_url,
        contract_pdf_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Sync name/status to clients table
    if (data && client_name) {
      await supabase
        .from('clients')
        .update({
          name: client_name,
          status: status === 'active' ? 'active' : 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
        .eq('name', data.client_name)
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
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

    const { error } = await supabase
      .from('finance_clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Sync soft-delete to clients table
    const { data: fc } = await supabase
      .from('finance_clients')
      .select('client_name')
      .eq('id', id)
      .single()
    if (fc?.client_name) {
      await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('name', fc.client_name)
        .is('deleted_at', null)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
