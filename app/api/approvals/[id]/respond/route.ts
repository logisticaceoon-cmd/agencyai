import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { token, action, comment } = body

    if (!token || !action) {
      return NextResponse.json({ error: 'Token y accion requeridos' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'revision_requested'].includes(action)) {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify token matches
    const { data: approval, error } = await supabase
      .from('approval_requests')
      .select('id, status, token, expires_at')
      .eq('id', id)
      .eq('token', token)
      .single()

    if (error || !approval) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'Esta solicitud ya fue respondida' }, { status: 400 })
    }

    if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Esta solicitud ha expirado' }, { status: 400 })
    }

    const { data, error: updateError } = await supabase
      .from('approval_requests')
      .update({
        status: action,
        client_comment: comment || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
