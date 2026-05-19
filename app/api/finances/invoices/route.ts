import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('createdAt', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/finances/invoices:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    const number = `FAC-${String((count || 0) + 1).padStart(3, '0')}`
    const items = body.items || []
    const subtotal = items.reduce((s: number, i: { quantity: number; unit_price: number }) => s + i.quantity * i.unit_price, 0)
    const taxRate = body.tax_rate || 0
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        workspace_id: workspaceId,
        client_id: body.client_id,
        number,
        status: body.status || 'draft',
        subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
        currency: body.currency || 'USD',
        issue_date: body.issue_date || new Date().toISOString().split('T')[0],
        due_date: body.due_date,
        items: JSON.stringify(items),
        notes: body.notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances/invoices:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
