import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/account/deactivate
// Desactiva la cuenta del usuario. Los datos se conservan 90 días.
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  const supabase = createAdminClient()

  try {
    const { data: org, error: fetchErr } = await supabase
      .from('organizations')
      .select('id, status, owner_id, plan')
      .eq('id', auth.workspaceId)
      .single()

    if (fetchErr || !org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    if (org.owner_id !== auth.userId) {
      return NextResponse.json({ error: 'Solo el dueño puede desactivar la cuenta' }, { status: 403 })
    }

    if (org.status === 'deactivated') {
      return NextResponse.json({ error: 'La cuenta ya está desactivada' }, { status: 400 })
    }

    const now = new Date()
    const deleteAfter = new Date(now)
    deleteAfter.setDate(deleteAfter.getDate() + 90)

    const { error: updateErr } = await supabase
      .from('organizations')
      .update({
        status: 'deactivated',
        deactivated_at: now.toISOString(),
        delete_after: deleteAfter.toISOString(),
        plan: 'free',
      })
      .eq('id', auth.workspaceId)

    if (updateErr) {
      console.error('Error deactivating org:', updateErr.message)
      console.error(updateErr)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta desactivada. Tus datos serán conservados hasta el ' + deleteAfter.toLocaleDateString('es-ES'),
      deleteAfter: deleteAfter.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error al desactivar cuenta:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
