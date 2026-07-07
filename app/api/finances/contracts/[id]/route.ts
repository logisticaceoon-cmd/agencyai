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
      .from('trafficker_contracts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error) {
      console.error('Error fetching contract:', error)
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in GET /api/finances/contracts/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
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

    const { data, error } = await supabase
      .from('trafficker_contracts')
      .update({
        trafficker_name: body.trafficker_name,
        client_name: body.client_name,
        service: body.service,
        monthly_fee: body.monthly_fee,
        currency: body.currency,
        commission_percent: body.commission_percent,
        start_date: body.start_date,
        notes: body.notes,
        contract_pdf_url: body.contract_pdf_url,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating contract:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PUT /api/finances/contracts/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
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

    const { data, error } = await supabase
      .from('trafficker_contracts')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting contract:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in DELETE /api/finances/contracts/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
