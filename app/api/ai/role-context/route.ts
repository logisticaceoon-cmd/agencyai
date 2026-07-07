import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET  /api/ai/role-context        → lista todos los roles con sus reglas
 * GET  /api/ai/role-context?role=X → reglas de un rol específico
 * PUT  /api/ai/role-context?role=X → actualizar reglas de un rol (solo owner)
 */

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    // Solo owner y admin pueden consultar las reglas
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle()

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    const isOwner = workspace?.owner_id === userId
    const role = member?.role || ''
    if (!isOwner && role !== 'admin') {
      return NextResponse.json({ error: 'Solo el owner o admin puede ver las reglas de rol' }, { status: 403 })
    }

    const url = new URL(request.url)
    const roleFilter = url.searchParams.get('role')

    const adminClient = createAdminClient()
    let query = adminClient.from('role_ai_context').select('*').order('role')

    if (roleFilter) {
      query = query.eq('role', roleFilter) as typeof query
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    // Solo owner puede modificar reglas de rol
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (workspace?.owner_id !== userId) {
      return NextResponse.json({ error: 'Solo el owner puede modificar las reglas de rol' }, { status: 403 })
    }

    const url = new URL(request.url)
    const roleParam = url.searchParams.get('role')
    if (!roleParam) {
      return NextResponse.json({ error: 'El parámetro ?role= es requerido' }, { status: 400 })
    }

    const validRoles = ['owner', 'admin', 'trafficker', 'viewer']
    if (!validRoles.includes(roleParam)) {
      return NextResponse.json({ error: `Rol inválido. Roles válidos: ${validRoles.join(', ')}` }, { status: 400 })
    }

    const body = await request.json()

    // Campos editables
    const allowed = [
      'display_name', 'allowed_topics', 'restricted_topics',
      'system_prompt_addition', 'can_create_tasks', 'can_view_finances',
      'can_view_team', 'can_view_all_clients', 'can_view_performance',
      'can_view_reports', 'tone_instruction',
    ]

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key]
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('role_ai_context')
      .update(updateData)
      .eq('role', roleParam)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data, message: `Reglas del rol "${roleParam}" actualizadas correctamente` })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
