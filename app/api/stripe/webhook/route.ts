import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

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
    const supabase = await createServiceRoleClient()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: { workspaceId?: string; planId?: string } }
      const workspaceId = session.metadata?.workspaceId
      const planId = session.metadata?.planId

      if (workspaceId && planId) {
        await supabase
          .from('workspaces')
          .update({
            plan: planId,
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', workspaceId)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as { customer?: string }
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : undefined

      if (customerId) {
        await supabase
          .from('workspaces')
          .update({ plan: 'free', plan_expires_at: null })
          .eq('stripe_customer_id', customerId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
