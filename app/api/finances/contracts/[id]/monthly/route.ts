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
    const { id: contractId } = await params

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabase
      .from('contract_monthly_records')
      .select('*')
      .eq('contract_id', contractId)
      .eq('workspace_id', workspaceId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (month) {
      query = query.eq('month', parseInt(month))
    }
    if (year) {
      query = query.eq('year', parseInt(year))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching monthly records:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/finances/contracts/[id]/monthly:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: contractId } = await params

    const body = await request.json()
    const { month, year, monthly_fee, commission_amount, currency, status, notes } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'month y year son requeridos' }, { status: 400 })
    }

    // Check if record already exists for this contract + month + year
    const { data: existing } = await supabase
      .from('contract_monthly_records')
      .select('id')
      .eq('contract_id', contractId)
      .eq('workspace_id', workspaceId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('contract_monthly_records')
        .update({
          monthly_fee,
          commission_amount,
          currency,
          status,
          notes,
        })
        .eq('id', existing.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) {
        console.error('Error updating monthly record:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Insert new record
    const { data, error } = await supabase
      .from('contract_monthly_records')
      .insert({
        contract_id: contractId,
        workspace_id: workspaceId,
        month,
        year,
        monthly_fee: monthly_fee || 0,
        commission_amount: commission_amount || 0,
        currency: currency || 'USD',
        status: status || 'pending',
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating monthly record:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances/contracts/[id]/monthly:', err)
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
    const { id: contractId } = await params

    const body = await request.json()
    const { month, year, monthly_fee, commission_amount, currency, status, notes } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'month y year son requeridos' }, { status: 400 })
    }

    // Find existing record
    const { data: existing } = await supabase
      .from('contract_monthly_records')
      .select('id')
      .eq('contract_id', contractId)
      .eq('workspace_id', workspaceId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Registro mensual no encontrado' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('contract_monthly_records')
      .update({
        monthly_fee,
        commission_amount,
        currency,
        status,
        notes,
      })
      .eq('id', existing.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating monthly record:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PUT /api/finances/contracts/[id]/monthly:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
