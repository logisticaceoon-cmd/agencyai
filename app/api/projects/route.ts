import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

const createProjectSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  clientId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  color: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().min(0, 'El presupuesto debe ser positivo').optional().nullable(),
  ownerId: z.string().optional(),
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
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')

    const appRole = normalizeRole(role)
    const scope = getDataScope('projects', appRole)

    let query = supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    // Trafficker/viewer: solo proyectos donde son owner o tienen tareas asignadas
    if (scope === 'assigned') {
      // Proyectos donde son owner_id
      const { data: myProjectIds } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('owner_id', userId)

      // Proyectos con tareas asignadas al usuario
      const { data: myTaskProjects } = await supabase
        .from('tasks')
        .select('projectId')
        .eq('workspace_id', workspaceId)
        .contains('assignedTo', [userId])
        .not('projectId', 'is', null)

      const fromOwner = (myProjectIds || []).map((p: { id: string }) => p.id)
      const fromTasks = (myTaskProjects || []).map((t: { projectId: string }) => t.projectId).filter(Boolean)
      const ids = [...new Set([...fromOwner, ...fromTasks])]

      if (ids.length === 0) return NextResponse.json({ data: [] })
      query = query.in('id', ids)
    }

    if (clientId) query = query.eq('clientId', clientId)
    if (status) query = query.eq('status', status)

    const { data: projects, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ data: [], page, pageSize, hasMore: false })
    }

    const results = projects || []
    return NextResponse.json({ data: results, page, pageSize, hasMore: results.length === pageSize })
  } catch (err) {
    console.error('Error in GET /api/projects:', err)
    return NextResponse.json({ data: [], page: 1, pageSize: 50, hasMore: false })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para crear proyectos' }, { status: 403 })
    }

    const body = await request.json()
    const result = createProjectSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const parsed = result.data

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        clientId: parsed.clientId || null,
        name: parsed.name,
        description: parsed.description || null,
        status: parsed.status || 'active',
        color: parsed.color || '#2563eb',
        startDate: parsed.startDate || null,
        endDate: parsed.endDate || null,
        budget: parsed.budget || null,
        // owner_id: siempre el creador actual (si no se especifica otro)
        owner_id: parsed.ownerId || userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/projects:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
