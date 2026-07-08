import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params
  const supabase = await createServiceRoleClient()

  const { data: access } = await supabase
    .from('client_portal_access')
    .select('client_id, workspace_id')
    .eq('access_token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 404 })

  // Verify invoice belongs to this client and is payable
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, total, currency, status')
    .eq('id', id)
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Factura ya pagada' }, { status: 400 })

  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey || stripeKey === 'YOUR_STRIPE_SECRET_KEY') {
    // Mock mode: mark as paid directly
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)

    // Log activity
    await supabase.from('portal_activity').insert({
      workspace_id: access.workspace_id,
      client_id: access.client_id,
      portal_token: token,
      action: 'paid_invoice',
      entity_type: 'invoice',
      entity_id: id,
    })

    return NextResponse.json({ success: true, mock: true })
  }

  // Real Stripe checkout
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const origin = new URL(request.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (invoice.currency || 'usd').toLowerCase(),
            product_data: {
              name: `Factura ${invoice.number}`,
            },
            unit_amount: Math.round(Number(invoice.total) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: id,
        workspace_id: access.workspace_id,
        portal_token: token,
      },
      success_url: `${origin}/portal/${token}/invoices?paid=${id}`,
      cancel_url: `${origin}/portal/${token}/invoices`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: 'Error al crear sesion de pago' }, { status: 500 })
  }
}
