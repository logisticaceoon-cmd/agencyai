import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole } from '@/lib/roles'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole !== 'owner') {
      return NextResponse.json({ error: 'Solo el dueño puede modificar roles' }, { status: 403 })
    }

    // Cannot modify system roles (except label/description/color)
    const { data: existing } = await supabase
      .from('workspace_roles')
      .select('is_system')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const allowed: Record<string, unknown> = {}

    if (existing.is_system) {
      // System roles: only label, description, color can change
      if (body.label) allowed.label = body.label
      if (body.description !== undefined) allowed.description = body.description
      if (body.color) allowed.color = body.color
    } else {
      // Custom roles: everything except key (to avoid breaking member records)
      if (body.label) allowed.label = body.label
      if (body.description !== undefined) allowed.description = body.description
      if (body.color) allowed.color = body.color
      if (body.base_role && ['owner','admin','trafficker','viewer'].includes(body.base_role)) {
        allowed.base_role = body.base_role
      }
      if (body.is_active !== undefined) allowed.is_active = body.is_active
    }

    const { data, error } = await supabase
      .from('workspace_roles')
      .update(allowed)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PATCH /api/roles/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole !== 'owner') {
      return NextResponse.json({ error: 'Solo el dueño puede eliminar roles' }, { status: 403 })
    }

    // Cannot delete system roles
    const { data: existing } = await supabase
      .from('workspace_roles')
      .select('is_system')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    if (existing.is_system) {
      return NextResponse.json({ error: 'Los roles del sistema no se pueden eliminar' }, { status: 403 })
    }

    // Soft delete (deactivate)
    await supabase
      .from('workspace_roles')
      .update({ is_active: false })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/roles/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
