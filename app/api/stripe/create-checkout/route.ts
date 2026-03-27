import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

const PLAN_PRICES: Record<string, { name: string; amount: number }> = {
  pro: { name: 'Plan Pro', amount: 2900 },
  agency: { name: 'Plan Agency', amount: 7900 },
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  try {
    const { planId } = await request.json()
    const plan = PLAN_PRICES[planId]
    if (!plan) return NextResponse.json({ error: 'Plan no valido' }, { status: 400 })

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey === 'YOUR_STRIPE_SECRET_KEY') {
      // Mock mode: upgrade immediately
      await supabase
        .from('workspaces')
        .update({
          plan: planId,
          plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', workspaceId)

      return NextResponse.json({
        url: `/settings/billing?mock=true&plan=${planId}`,
        mock: true,
      })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    // Get or create customer
    let { data: ws } = await supabase
      .from('workspaces')
      .select('stripe_customer_id, name')
      .eq('id', workspaceId)
      .single()

    let customerId = ws?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { workspaceId },
        name: ws?.name || undefined,
      })
      customerId = customer.id
      await supabase
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', workspaceId)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: { name: plan.name },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { workspaceId, planId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Error creando checkout' }, { status: 500 })
  }
}
