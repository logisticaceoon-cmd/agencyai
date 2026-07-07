import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/account/reactivate
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  const supabase = createAdminClient()

  try {
    const { data: org, error: fetchErr } = await supabase
      .from('organizations')
      .select('id, status, owner_id, delete_after')
      .eq('id', auth.workspaceId)
      .single()

    if (fetchErr || !org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    if (org.owner_id !== auth.userId) {
      return NextResponse.json({ error: 'Solo el dueño puede reactivar la cuenta' }, { status: 403 })
    }

    if (org.status === 'active') {
      return NextResponse.json({ error: 'La cuenta ya está activa' }, { status: 400 })
    }

    if (org.delete_after && new Date() > new Date(org.delete_after)) {
      return NextResponse.json({
        error: 'El período de retención expiró. Los datos ya no están disponibles.',
      }, { status: 410 })
    }

    const { error: updateErr } = await supabase
      .from('organizations')
      .update({ status: 'active', deactivated_at: null, delete_after: null, cancellation_scheduled_at: null })
      .eq('id', auth.workspaceId)

    if (updateErr) {
      console.error(updateErr)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta reactivada exitosamente. Todos tus datos han sido restaurados.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error al reactivar cuenta:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
