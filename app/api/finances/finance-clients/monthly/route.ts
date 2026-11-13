import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth-context'

// POST /api/finances/finance-clients/monthly
// Creates or updates a monthly record for a finance client
// Always injects workspace_id — prevents workspace_id = NULL bug
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const auth = await getAuthContext(req)
    if (!auth?.workspaceId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { client_id, month, year, billed_amount, commission_amount, currency, status, notes } = body

    if (!client_id || !month || !year) {
      return NextResponse.json({ error: 'client_id, month y year son requeridos' }, { status: 400 })
    }

    // Check if record already exists
    const { data: existing } = await supabase
      .from('finance_client_monthly')
      .select('id')
      .eq('client_id', client_id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('finance_client_monthly')
        .update({
          billed_amount: billed_amount ?? 0,
          commission_amount: commission_amount ?? 0,
          currency: currency ?? 'USD',
          status: status ?? 'pending',
          notes: notes ?? null,
          workspace_id: auth.workspaceId,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data, updated: true })
    }

    // Insert
    const { data, error } = await supabase
      .from('finance_client_monthly')
      .insert({
        client_id,
        month,
        year,
        billed_amount: billed_amount ?? 0,
        commission_amount: commission_amount ?? 0,
        currency: currency ?? 'USD',
        status: status ?? 'pending',
        notes: notes ?? null,
        workspace_id: auth.workspaceId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, created: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/finances/finance-clients/monthly?client_id=X&month=11&year=2026
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const auth = await getAuthContext(req)
    if (!auth?.workspaceId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const client_id = searchParams.get('client_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabase
      .from('finance_client_monthly')
      .select('*')
      .eq('workspace_id', auth.workspaceId)

    if (client_id) query = query.eq('client_id', client_id)
    if (month) query = query.eq('month', parseInt(month))
    if (year) query = query.eq('year', parseInt(year))

    const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
