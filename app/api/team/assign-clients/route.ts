/**
 * POST /api/team/assign-clients
 * Asigna clientes a un miembro del equipo (solo owner/admin)
 * Body: { member_user_id: string, client_ids: string[] }
 *
 * GET /api/team/assign-clients?member_user_id=xxx
 * Devuelve los clientes asignados a un miembro
 */
import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole } from '@/lib/roles'

export async function GET(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { searchParams } = new URL(request.url)
  const memberUserId = searchParams.get('member_user_id')

  if (!memberUserId) {
    return NextResponse.json({ error: 'member_user_id requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('member_client_assignments')
    .select('client_id, clients(id, name, status, brand)')
    .eq('workspace_id', workspaceId)
    .eq('member_user_id', memberUserId)

  // PGRST205 = table not found (DDL pending) — return empty gracefully
  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('not found')) {
      return NextResponse.json({ data: [], _tableReady: false })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId, role } = auth

  const appRole = normalizeRole(role)
  if (appRole !== 'owner' && appRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { member_user_id, client_ids } = body as { member_user_id: string; client_ids: string[] }

  if (!member_user_id || !Array.isArray(client_ids)) {
    return NextResponse.json({ error: 'member_user_id y client_ids requeridos' }, { status: 400 })
  }

  // Verificar que el miembro pertenece al workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('user_id', member_user_id)
    .eq('status', 'active')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Miembro no encontrado en este workspace' }, { status: 404 })
  }

  // Eliminar asignaciones anteriores del miembro en este workspace
  const { error: delError } = await supabase
    .from('member_client_assignments')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('member_user_id', member_user_id)

  if (delError && (delError.code === 'PGRST205' || delError.message?.includes('not found'))) {
    return NextResponse.json({
      error: 'Tabla member_client_assignments no existe. Ejecutar el SQL de setup en Supabase Dashboard.',
      _tableReady: false,
    }, { status: 503 })
  }

  // Insertar nuevas asignaciones
  if (client_ids.length > 0) {
    const rows = client_ids.map(clientId => ({
      workspace_id: workspaceId,
      member_user_id,
      client_id: clientId,
    }))

    const { error } = await supabase
      .from('member_client_assignments')
      .insert(rows)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  }

  // Crear proyectos de gestión para cada cliente asignado (si no existen)
  for (const clientId of client_ids) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single()

    if (!client) continue

    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('owner_id', member_user_id)
      .eq('clientId', clientId)
      .single()

    if (!existing) {
      await supabase.from('projects').insert({
        workspace_id: workspaceId,
        owner_id: member_user_id,
        clientId,
        name: `${client.name} — Gestión de campaña`,
        status: 'active',
      })
    }
  }

  return NextResponse.json({
    message: `${client_ids.length} cliente(s) asignados a ${member.name}`,
    assigned: client_ids.length,
  })
}
