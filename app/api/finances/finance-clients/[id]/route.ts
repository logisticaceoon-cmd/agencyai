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

// Helper: sync status change to CRM clients table (case-insensitive, matches name OR brand)
async function syncClientStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
  clientName: string,
  newStatus: 'active' | 'inactive'
) {
  if (!clientName) return
  const nameLower = clientName.toLowerCase()
  // Get all workspace clients and match case-insensitively
  const { data: crmClients } = await supabase
    .from('clients')
    .select('id, name, brand, status')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (!crmClients) return

  const matches = crmClients.filter((c: { name: string; brand: string; id: string; status: string }) => {
    const n = (c.name || '').toLowerCase()
    const b = (c.brand || '').toLowerCase()
    return n === nameLower || b === nameLower
  })

  for (const match of matches) {
    if (match.status !== newStatus) {
      await supabase
        .from('clients')
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
        .eq('id', match.id)
        .eq('workspace_id', workspaceId)
    }
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
      deleted_at,
      end_month,
      end_year,
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
        deleted_at: deleted_at !== undefined ? deleted_at : undefined,
        end_month: end_month !== undefined ? end_month : undefined,
        end_year: end_year !== undefined ? end_year : undefined,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Sync status to CRM clients table (case-insensitive, name OR brand)
    if (data && (client_name || company_name)) {
      const nameToSync = client_name || company_name
      const crmStatus = status === 'active' ? 'active' : 'inactive'
      await syncClientStatus(supabase as Parameters<typeof syncClientStatus>[0], workspaceId, nameToSync, crmStatus)
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

    // Get client name before deleting
    const { data: fc } = await supabase
      .from('finance_clients')
      .select('client_name, company_name')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('finance_clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Sync soft-delete to CRM clients table (case-insensitive, name OR brand)
    if (fc?.client_name || fc?.company_name) {
      const nameToSync = fc.client_name || fc.company_name
      await syncClientStatus(supabase as Parameters<typeof syncClientStatus>[0], workspaceId, nameToSync, 'inactive')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
