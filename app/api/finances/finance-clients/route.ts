import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const includeDeleted = searchParams.get('include_deleted')
    const now = new Date()
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10)
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10)

    let query = supabase
      .from('finance_clients')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (includeDeleted !== 'true') {
      query = query.is('deleted_at', null)
    }

    const { data: clients, error: clientsError } = await query
      .order('created_at', { ascending: false })

    if (clientsError) {
      console.error(clientsError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    const clientIds = (clients || []).map((c: any) => c.id)
    let records: any[] = []
    if (clientIds.length > 0) {
      const { data: monthly, error: monthlyError } = await supabase
        .from('finance_client_monthly')
        .select('*')
        .in('client_id', clientIds)
        .eq('month', month)
        .eq('year', year)

      if (monthlyError) {
        console.error(monthlyError)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
      }
      records = monthly || []
    }

    return NextResponse.json({ data: clients, monthlyRecords: records })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Helper: find existing CRM client by name or brand (case-insensitive), then create if not found
async function syncNewClientToCRM(
  supabase: any,
  workspaceId: string,
  clientName: string,
  companyName: string | null,
  currency: string,
  contractCost: number | null,
  status: string,
  observations: string | null
) {
  const nameLower = clientName.toLowerCase()
  const companyLower = (companyName || '').toLowerCase()

  // Search for existing match by name or brand (case-insensitive)
  const { data: existing } = await supabase
    .from('clients')
    .select('id, name, brand, status')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  const match = (existing || []).find((c: any) => {
    const n = (c.name || '').toLowerCase()
    const b = (c.brand || '').toLowerCase()
    return n === nameLower || b === nameLower || n === companyLower || b === companyLower
  })

  const crmStatus = status === 'active' ? 'active' : 'inactive'

  if (match) {
    // Update existing CRM client
    await supabase
      .from('clients')
      .update({
        status: crmStatus,
        monthlyFee: contractCost || null,
        notes: observations || null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', match.id)
      .eq('workspace_id', workspaceId)
  } else {
    // Create new CRM client
    await supabase
      .from('clients')
      .insert({
        workspace_id: workspaceId,
        name: clientName,
        brand: companyName || clientName,
        currency: currency || 'USD',
        status: crmStatus,
        monthlyFee: contractCost || null,
        notes: observations || null,
      })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

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
      .insert({
        workspace_id: workspaceId,
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
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Sync to CRM clients table (find-or-create, case-insensitive)
    if (data && client_name) {
      syncNewClientToCRM(
        supabase, workspaceId,
        client_name, company_name || null,
        currency || 'USD', contract_cost || null,
        status || 'active', observations || null
      ).catch(e => console.error('CRM sync failed:', e))
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
