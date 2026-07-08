import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params
  const supabase = await createServiceRoleClient()

  const { data: access } = await supabase
    .from('client_portal_access')
    .select('client_id, workspace_id')
    .eq('access_token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 404 })

  const body = await request.json()
  const { action, notes } = body

  if (!action || !['approved', 'revision_requested'].includes(action)) {
    return NextResponse.json({ error: 'Accion invalida. Usa "approved" o "revision_requested"' }, { status: 400 })
  }

  // Verify the deliverable belongs to this client
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('id')
    .eq('id', id)
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .single()

  if (!deliverable) {
    return NextResponse.json({ error: 'Entregable no encontrado' }, { status: 404 })
  }

  const { error } = await supabase
    .from('deliverables')
    .update({
      status: action,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al actualizar entregable' }, { status: 500 })
  }

  // Log activity
  await supabase.from('portal_activity').insert({
    workspace_id: access.workspace_id,
    client_id: access.client_id,
    portal_token: token,
    action: action === 'approved' ? 'approved_deliverable' : 'requested_revision',
    entity_type: 'deliverable',
    entity_id: id,
  })

  return NextResponse.json({ success: true })
}
