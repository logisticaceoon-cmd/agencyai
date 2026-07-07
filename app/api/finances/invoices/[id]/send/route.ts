import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    // Get invoice with client info
    const { data: invoice, error: fetchErr } = await supabase
      .from('invoices')
      .select('*, clients(id, name, email)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'La factura ya esta pagada' }, { status: 400 })
    }

    // Mark as sent
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name, email)')
      .single()

    if (error) {
      console.error('Error sending invoice:', error)
      return NextResponse.json({ error: 'Error al enviar factura' }, { status: 500 })
    }

    // TODO: Send email via Resend if RESEND_API_KEY is configured
    // const clientEmail = invoice.clients?.email
    // if (clientEmail && process.env.RESEND_API_KEY) { ... }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in POST /api/finances/invoices/[id]/send:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
