import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || stripeKey === 'YOUR_STRIPE_SECRET_KEY') {
    return NextResponse.json({ received: true, mock: true })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    const supabase = createAdminClient()

    // ── Pago exitoso: activar plan ─────────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: { workspaceId?: string; planId?: string }
        customer?: string
      }
      const workspaceId = session.metadata?.workspaceId
      const planId = session.metadata?.planId
      const customerId = typeof session.customer === 'string' ? session.customer : undefined

      if (workspaceId && planId) {
        const planExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        // Actualizar workspaces (Cowork API)
        await supabase
          .from('workspaces')
          .update({ plan: planId, plan_expires_at: planExpiry })
          .eq('id', workspaceId)

        // Actualizar organizations (app)
        await supabase
          .from('organizations')
          .update({
            plan: planId,
            status: 'active',
            deactivated_at: null,
            delete_after: null,
            cancellation_scheduled_at: null,
            ...(customerId ? { stripe_customer_id: customerId } : {}),
          })
          .eq('id', workspaceId)
      }
    }

    // ── Suscripción renovada: limpiar flags de cancelación ────────────────────
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as {
        customer?: string
        cancel_at_period_end?: boolean
        status?: string
      }
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : undefined

      if (customerId && subscription.cancel_at_period_end === false && subscription.status === 'active') {
        await supabase
          .from('organizations')
          .update({ status: 'active', cancellation_scheduled_at: null })
          .eq('stripe_customer_id', customerId)
      }
    }

    // ── Suscripción eliminada definitivamente: bajar a Free ───────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as { customer?: string }
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : undefined

      if (customerId) {
        await supabase
          .from('workspaces')
          .update({ plan: 'free', plan_expires_at: null })
          .eq('stripe_customer_id', customerId)

        await supabase
          .from('organizations')
          .update({ plan: 'free', status: 'active', cancellation_scheduled_at: null })
          .eq('stripe_customer_id', customerId)
      }
    }

    // ── Pago fallido 3 veces: marcar como cancelado ───────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as { customer?: string; attempt_count?: number }
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : undefined

      if (customerId && (invoice.attempt_count ?? 0) >= 3) {
        await supabase
          .from('organizations')
          .update({ status: 'cancelled', cancellation_scheduled_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
