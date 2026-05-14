import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'
import { FOUNDER_WORKSPACE_IDS, PLAN_MAP } from '@/lib/plans'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const appRole = normalizeRole(role)
    const scope = getDataScope('clients', appRole)

    // Para trafficker/viewer: solo los clientes donde tienen proyectos o tareas asignadas
    let clientIds: string[] | null = null
    if (scope === 'assigned') {
      // Obtener IDs de proyectos asignados
      const { data: myProjects } = await supabase
        .from('projects')
        .select('clientId')
        .eq('workspace_id', workspaceId)
        .eq('owner_id', userId)
        .not('clientId', 'is', null)

      // Obtener IDs de clientes de tareas asignadas
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('clientId')
        .eq('workspace_id', workspaceId)
        .contains('assignedTo', [userId])
        .not('clientId', 'is', null)

      const fromProjects = (myProjects || []).map((p: { clientId: string }) => p.clientId).filter(Boolean)
      const fromTasks = (myTasks || []).map((t: { clientId: string }) => t.clientId).filter(Boolean)
      clientIds = [...new Set([...fromProjects, ...fromTasks])]
    }

    let query = supabase
      .from('clients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .limit(200)
      .order('created_at', { ascending: false })

    if (clientIds !== null) {
      if (clientIds.length === 0) return NextResponse.json({ data: [] })
      query = query.in('id', clientIds)
    }

    if (status) query = query.eq('status', status)
    if (search) query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,email.ilike.%${search}%`)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/clients:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'trafficker' || appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para crear clientes' }, { status: 403 })
    }

    // ─── Verificar límite de clientes según el plan ──────────────────────────
    if (!FOUNDER_WORKSPACE_IDS.has(workspaceId)) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('plan')
        .eq('id', workspaceId)
        .single()

      const plan = ws?.plan || 'free'
      const planDef = PLAN_MAP[plan as keyof typeof PLAN_MAP] ?? PLAN_MAP.free
      const maxClients = planDef.maxClients

      if (maxClients !== Infinity) {
        const { count } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null)

        if ((count ?? 0) >= maxClients) {
          const planNames: Record<string, string> = {
            free: 'Free (3 clientes)',
            pro: 'Pro (8 clientes)',
            agency: 'Agency (20 clientes)',
          }
          return NextResponse.json({
            error: `Límite de clientes alcanzado. Tu plan ${planNames[plan] || plan} permite máximo ${maxClients} clientes. Actualizá tu plan para agregar más.`,
            limitReached: true,
            maxClients,
          }, { status: 403 })
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const body = await request.json()

    const { data, error } = await supabase
      .from('clients')
      .insert({
        workspace_id: workspaceId,
        name: body.name,
        brand: body.brand || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
        status: body.status || 'active',
        industry: body.industry || null,
        notes: body.notes || null,
        monthlyFee: body.monthlyFee || null,
        currency: body.currency || 'USD',
        pays_percentage: body.pays_percentage ?? false,
        percentage_value: body.percentage_value || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync to finance_clients (upsert by client_name + workspace_id)
    if (data) {
      const { error: fcError } = await supabase
        .from('finance_clients')
        .upsert({
          workspace_id: workspaceId,
          client_name: data.name,
          status: data.status === 'active' ? 'active' : 'inactive',
          contract_cost: data.monthlyFee || 0,
          currency: data.currency || 'USD',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,client_name', ignoreDuplicates: true })
      if (fcError) console.error('Sync to finance_clients failed:', fcError.message)
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/clients:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
