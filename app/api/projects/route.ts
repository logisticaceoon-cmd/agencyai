import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')

    const appRole = normalizeRole(role)
    const scope = getDataScope('projects', appRole)

    let query = supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .limit(200)
      .order('created_at', { ascending: false })

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
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: projects || [] })
  } catch (err) {
    console.error('Error in GET /api/projects:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para crear proyectos' }, { status: 403 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        clientId: body.clientId || null,
        name: body.name,
        description: body.description || null,
        status: body.status || 'active',
        color: body.color || '#2563eb',
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        budget: body.budget || null,
        owner_id: body.ownerId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/projects:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
