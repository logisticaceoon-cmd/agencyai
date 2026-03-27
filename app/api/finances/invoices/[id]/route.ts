import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(id, name, company, email, phone, website)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.status) updates.status = body.status
    if (body.status === 'paid') updates.paid_at = new Date().toISOString()
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.due_date) updates.due_date = body.due_date
    if (body.items) {
      updates.items = JSON.stringify(body.items)
      const subtotal = body.items.reduce((s: number, i: { quantity: number; unit_price: number }) => s + i.quantity * i.unit_price, 0)
      const taxRate = body.tax_rate ?? 0
      updates.subtotal = subtotal
      updates.tax_rate = taxRate
      updates.tax_amount = subtotal * (taxRate / 100)
      updates.total = subtotal + subtotal * (taxRate / 100)
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name, company, email)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
