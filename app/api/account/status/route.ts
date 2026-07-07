import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/account/status
export async function GET() {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  const supabase = createAdminClient()

  try {
    const { data: org, error: fetchErr } = await supabase
      .from('organizations')
      .select('id, status, plan, deactivated_at, delete_after, cancellation_scheduled_at, stripe_customer_id')
      .eq('id', auth.workspaceId)
      .single()

    if (fetchErr || !org) {
      // Si las columnas no existen aún, retornar estado por defecto
      if (fetchErr?.message?.includes('column')) {
        return NextResponse.json({ status: 'active', plan: 'free', daysUntilDeletion: null, hasStripe: false })
      }
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const now = new Date()
    const daysUntilDeletion = org.delete_after
      ? Math.ceil((new Date(org.delete_after).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      status: org.status ?? 'active',
      plan: org.plan,
      deactivatedAt: org.deactivated_at,
      deleteAfter: org.delete_after,
      cancellationScheduledAt: org.cancellation_scheduled_at,
      daysUntilDeletion,
      hasStripe: !!org.stripe_customer_id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error obteniendo estado de cuenta:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
