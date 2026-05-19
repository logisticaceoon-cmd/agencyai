import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole } from '@/lib/roles'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('createdAt', { ascending: true })

    if (error) {
      // Table might not exist yet — return defaults
      console.error('Error fetching roles:', error.message)
      return NextResponse.json({ data: getDefaultRoles() })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ data: getDefaultRoles() })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in GET /api/roles:', err)
    return NextResponse.json({ data: getDefaultRoles() })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    // Only owner can create custom roles
    const appRole = normalizeRole(role)
    if (appRole !== 'owner') {
      return NextResponse.json({ error: 'Solo el dueño puede crear roles' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.key || !body.label || !body.base_role) {
      return NextResponse.json({ error: 'key, label y base_role son requeridos' }, { status: 400 })
    }

    // Validate base_role
    if (!['owner', 'admin', 'trafficker', 'viewer'].includes(body.base_role)) {
      return NextResponse.json({ error: 'base_role inválido' }, { status: 400 })
    }

    // Sanitize key
    const key = body.key.toLowerCase().replace(/[^a-z0-9_-]/g, '_')

    const { data, error } = await supabase
      .from('workspace_roles')
      .insert({
        workspace_id: workspaceId,
        key,
        label: body.label,
        description: body.description || null,
        color: body.color || '#6366f1',
        base_role: body.base_role,
        is_system: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un rol con ese identificador' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/roles:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function getDefaultRoles() {
  return [
    { id: 'owner', key: 'owner', label: 'Dueño', description: 'Acceso total.', color: '#f59e0b', base_role: 'owner', is_system: true, is_active: true },
    { id: 'admin', key: 'admin', label: 'Admin', description: 'Acceso operativo completo.', color: '#8b5cf6', base_role: 'admin', is_system: true, is_active: true },
    { id: 'trafficker', key: 'trafficker', label: 'Trafficker', description: 'Clientes y tareas asignados.', color: '#3b82f6', base_role: 'trafficker', is_system: true, is_active: true },
    { id: 'viewer', key: 'viewer', label: 'Solo lectura', description: 'Solo reportes y KPIs.', color: '#64748b', base_role: 'viewer', is_system: true, is_active: true },
  ]
}
