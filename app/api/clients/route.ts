import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'
import { FOUNDER_WORKSPACE_IDS, PLAN_MAP } from '@/lib/plans'
import { sanitizeError } from '@/lib/sanitize-error'

const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  brand: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(['active', 'inactive', 'lead', 'churned']).optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  monthlyFee: z.number().min(0, 'La tarifa mensual debe ser positiva').optional().nullable(),
  currency: z.string().optional(),
  pays_percentage: z.boolean().optional(),
  percentage_value: z.number().min(0).max(100).optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * pageSize
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const appRole = normalizeRole(role)
    const scope = getDataScope('clients', appRole)

    // Para trafficker/viewer: solo los clientes asignados directamente
    let clientIds: string[] | null = null
    if (scope === 'assigned') {
      // 1. Asignaciones directas (member_client_assignments — fuente principal)
      const { data: directAssignments } = await supabase
        .from('member_client_assignments')
        .select('client_id')
        .eq('workspace_id', workspaceId)
        .eq('member_user_id', userId)

      // 2. Proyectos donde son owner (respaldo / proyectos creados por ellos)
      const { data: myProjects } = await supabase
        .from('projects')
        .select('clientId')
        .eq('workspace_id', workspaceId)
        .eq('owner_id', userId)
        .not('clientId', 'is', null)

      // 3. Tareas asignadas con clientId
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('clientId')
        .eq('workspace_id', workspaceId)
        .contains('assignedTo', [userId])
        .not('clientId', 'is', null)

      const fromDirect = (directAssignments || []).map((a: { client_id: string }) => a.client_id).filter(Boolean)
      const fromProjects = (myProjects || []).map((p: { clientId: string }) => p.clientId).filter(Boolean)
      const fromTasks = (myTasks || []).map((t: { clientId: string }) => t.clientId).filter(Boolean)
      clientIds = [...new Set([...fromDirect, ...fromProjects, ...fromTasks])]
    }

    let query = supabase
      .from('clients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (clientIds !== null) {
      if (clientIds.length === 0) return NextResponse.json({ data: [] })
      query = query.in('id', clientIds)
    }

    if (status) query = query.eq('status', status)
    if (search) {
      const s = search.replace(/[%_\\,()]/g, '\\$&')
      query = query.or(`name.ilike.%${s}%,brand.ilike.%${s}%,email.ilike.%${s}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ data: [], page, pageSize, hasMore: false })
    }

    const results = data || []
    return NextResponse.json({ data: results, page, pageSize, hasMore: results.length === pageSize })
  } catch (err) {
    console.error('Error in GET /api/clients:', err)
    return NextResponse.json({ data: [], page: 1, pageSize: 50, hasMore: false })
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
    const result = createClientSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const parsed = result.data

    const { data, error } = await supabase
      .from('clients')
      .insert({
        workspace_id: workspaceId,
        name: parsed.name,
        brand: parsed.brand || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        website: parsed.website || null,
        status: parsed.status || 'active',
        industry: parsed.industry || null,
        notes: parsed.notes || null,
        monthlyFee: parsed.monthlyFee || null,
        currency: parsed.currency || 'USD',
        pays_percentage: parsed.pays_percentage ?? false,
        percentage_value: parsed.percentage_value || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'POST /api/clients') }, { status: 500 })
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
