import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const body = await request.json().catch(() => ({}))
    const paymentMethod = body.payment_method || null

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name, email)')
      .single()

    if (error) {
      console.error('Error marking invoice paid:', error)
      return NextResponse.json({ error: 'Error al marcar como pagada' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in POST /api/finances/invoices/[id]/mark-paid:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
