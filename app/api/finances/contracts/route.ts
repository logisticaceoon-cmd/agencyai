import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('include_deleted') === 'true'
    const now = new Date()
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()))

    // Fetch contracts
    let query = supabase
      .from('trafficker_contracts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (!includeDeleted) {
      query = query.neq('status', 'deleted')
    }

    const { data: contracts, error: contractsError } = await query

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError)
      return NextResponse.json({ data: [], monthlyRecords: [] })
    }

    // Fetch monthly records for the specified month/year
    const { data: monthlyRecords, error: recordsError } = await supabase
      .from('contract_monthly_records')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('month', month)
      .eq('year', year)

    if (recordsError) {
      console.error('Error fetching monthly records:', recordsError)
    }

    return NextResponse.json({
      data: contracts || [],
      monthlyRecords: monthlyRecords || [],
    })
  } catch (err) {
    console.error('Error in GET /api/finances/contracts:', err)
    return NextResponse.json({ data: [], monthlyRecords: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('trafficker_contracts')
      .insert({
        workspace_id: workspaceId,
        code: body.code,
        trafficker_name: body.trafficker_name,
        client_name: body.client_name || null,
        service: body.service || null,
        monthly_fee: body.monthly_fee || 0,
        currency: body.currency || 'USD',
        commission_percent: body.commission_percent || 0,
        start_date: body.start_date || null,
        notes: body.notes || null,
        contract_pdf_url: body.contract_pdf_url || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contract:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances/contracts:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
