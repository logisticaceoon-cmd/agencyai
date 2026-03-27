import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST() {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey === 'YOUR_STRIPE_SECRET_KEY') {
      return NextResponse.json({ url: '/settings/billing?mock=true', mock: true })
    }

    const { data: ws } = await supabase
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('id', workspaceId)
      .single()

    if (!ws?.stripe_customer_id) {
      return NextResponse.json({ error: 'No hay suscripcion activa' }, { status: 400 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const session = await stripe.billingPortal.sessions.create({
      customer: ws.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Error creando portal' }, { status: 500 })
  }
}
