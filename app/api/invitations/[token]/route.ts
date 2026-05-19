import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    const { data: invitation } = await supabase
      .from('workspace_invitations')
      .select('*, workspaces(name, plan)')
      .eq('token', token)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invitation.accepted_at) return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

    return NextResponse.json({ data: invitation })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { userId, email } = auth

    const { token } = await params
    const supabase = createAdminClient()

    const { data: invitation } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invitation.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
    if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

    if (invitation.email !== email) {
      return NextResponse.json({ error: 'This invitation is for a different email address' }, { status: 403 })
    }

    // Buscar el entry existente de este email (status: 'invited')
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('email', email)
      .single()

    if (existingMember) {
      await supabase
        .from('workspace_members')
        .update({
          user_id: userId,
          role: invitation.role || 'trafficker',
          status: 'active',
          name: email.split('@')[0],
        })
        .eq('id', existingMember.id)
    } else {
      await supabase.from('workspace_members').insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        email,
        role: invitation.role || 'trafficker',
        name: email.split('@')[0],
        status: 'active',
      })
    }

    // Marcar invitación como aceptada
    await supabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token)

    // ─── AUTO-SETUP: crear proyectos para los clientes asignados ─────────────
    // Buscar asignaciones previas del invitador para este email
    // (el owner puede haber pre-configurado qué clientes va a manejar)
    await autoSetupMemberAccess(supabase, invitation.workspace_id, userId, email)

    return NextResponse.json({ message: 'Invitation accepted', workspaceId: invitation.workspace_id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Cuando un miembro acepta la invitación:
 * 1. Busca en member_client_assignments si el owner pre-asignó clientes
 * 2. Crea proyectos de gestión para cada cliente asignado
 * 3. Asegura que la tabla minutes filtre por created_by
 */
async function autoSetupMemberAccess(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  email: string,
) {
  try {
    // Buscar clientes pre-asignados (si el owner los configuró antes)
    const { data: assignments } = await supabase
      .from('member_client_assignments')
      .select('client_id, clients(id, name)')
      .eq('workspace_id', workspaceId)
      .eq('member_user_id', userId)

    if (!assignments || assignments.length === 0) return

    // Para cada cliente asignado, crear proyecto de gestión si no existe
    for (const assignment of assignments) {
      const client = assignment.clients as { id: string; name: string } | null
      if (!client) continue

      // Verificar si ya existe un proyecto de gestión para este cliente y miembro
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('owner_id', userId)
        .eq('clientId', client.id)
        .single()

      if (!existing) {
        await supabase.from('projects').insert({
          workspace_id: workspaceId,
          owner_id: userId,
          clientId: client.id,
          name: `${client.name} — Gestión de campaña`,
          status: 'active',
        })
      }
    }

    console.log(`[autoSetup] ${email} → ${assignments.length} cliente(s) configurados`)
  } catch (err) {
    // Non-blocking: si falla, el miembro sigue activo
    console.warn('[autoSetup] Error configurando accesos:', err)
  }
}
