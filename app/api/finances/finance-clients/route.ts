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
      return NextResponse.json({ error: clientsError.message }, { status: 500 })
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
        return NextResponse.json({ error: monthlyError.message }, { status: 500 })
      }
      records = monthly || []
    }

    return NextResponse.json({ data: clients, monthlyRecords: records })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
