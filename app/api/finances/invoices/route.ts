import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')

  let query = supabase
    .from('invoices')
    .select('*, clients(id, name, company, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  try {
    const body = await request.json()

    // Auto-generate invoice number
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
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        currency: body.currency || 'USD',
        issue_date: body.issue_date || new Date().toISOString().split('T')[0],
        due_date: body.due_date,
        items: JSON.stringify(items),
        notes: body.notes,
      })
      .select('*, clients(id, name, company, email)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
