import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// POST /api/account/cancel-subscription
// Cancela la suscripción de Stripe al final del período ya pagado.
// El usuario sigue activo hasta la fecha de vencimiento, luego baja a Free.
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  const supabase = createAdminClient()

  try {
    const { data: org, error: fetchErr } = await supabase
      .from('organizations')
      .select('id, owner_id, plan, stripe_customer_id')
      .eq('id', auth.workspaceId)
      .single()

    if (fetchErr || !org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    if (org.owner_id !== auth.userId) {
      return NextResponse.json({ error: 'Solo el dueño puede cancelar la suscripción' }, { status: 403 })
    }

    if (org.plan === 'free') {
      return NextResponse.json({ error: 'No tienes una suscripción activa para cancelar' }, { status: 400 })
    }

    let periodEnd: Date | null = null

    // Si hay Stripe configurado, cancelar al final del período
    if (process.env.STRIPE_SECRET_KEY && org.stripe_customer_id) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

      // Obtener suscripción activa del cliente
      const subscriptions = await stripe.subscriptions.list({
        customer: org.stripe_customer_id,
        status: 'active',
        limit: 1,
      })

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0]

        // Cancelar al final del período (no inmediatamente)
        await stripe.subscriptions.update(sub.id, {
          cancel_at_period_end: true,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any
        const periodEndTs = subAny.current_period_end ?? subAny.items?.data?.[0]?.billing_cycle_anchor
        periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        const { error: updateErr } = await supabase
          .from('organizations')
          .update({
            status: 'cancelled',
            cancellation_scheduled_at: periodEnd.toISOString(),
          })
          .eq('id', auth.workspaceId)

        if (updateErr) {
          console.error('Error actualizando estado de cancelación:', updateErr.message)
        }

        return NextResponse.json({
          success: true,
          message: `Suscripción cancelada. Tu plan actual sigue activo hasta el ${periodEnd.toLocaleDateString('es-ES')}.`,
          periodEnd: periodEnd.toISOString(),
        })
      }
    }

    // Sin Stripe (mock) — cancela inmediatamente bajando a Free
    const { error: updateErr } = await supabase
      .from('organizations')
      .update({
        plan: 'free',
        status: 'active',
        cancellation_scheduled_at: null,
      })
      .eq('id', auth.workspaceId)

    if (updateErr) {
      return NextResponse.json({ error: 'Error al cancelar: ' + updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Suscripción cancelada. Tu cuenta fue movida al plan gratuito.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error al cancelar suscripción:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
