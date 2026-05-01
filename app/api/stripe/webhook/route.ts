import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

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
        // Actualizar workspaces (Cowork API)
        await supabase
          .from('workspaces')
          .update({
            plan: planId,
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', workspaceId)

        // Actualizar organizations (Prisma/app)
        await prisma.organization.updateMany({
          where: { id: workspaceId },
          data: {
            plan: planId as never,
            status: 'active',
            deactivatedAt: null,
            deleteAfter: null,
            cancellationScheduledAt: null,
            ...(customerId ? { stripeCustomerId: customerId } : {}),
          },
        })
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

      if (customerId) {
        // Si se reactivó (cancel_at_period_end pasó a false)
        if (subscription.cancel_at_period_end === false && subscription.status === 'active') {
          await prisma.organization.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              status: 'active',
              cancellationScheduledAt: null,
            },
          })
        }
      }
    }

    // ── Suscripción eliminada definitivamente: bajar a Free ───────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as { customer?: string }
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : undefined

      if (customerId) {
        // Actualizar workspaces (Cowork API)
        await supabase
          .from('workspaces')
          .update({ plan: 'free', plan_expires_at: null })
          .eq('stripe_customer_id', customerId)

        // Actualizar organizations (Prisma/app) — bajar a Free, marcar como cancelled
        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: 'free',
            status: 'active', // cancelled → ahora baja a free y sigue activo como free
            cancellationScheduledAt: null,
          },
        })
      }
    }

    // ── Pago fallido: avisar (no bloquear cuenta aún) ─────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as { customer?: string; attempt_count?: number }
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : undefined

      if (customerId && (invoice.attempt_count ?? 0) >= 3) {
        // Después de 3 intentos fallidos, marcar como cancelado
        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: 'cancelled',
            cancellationScheduledAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
