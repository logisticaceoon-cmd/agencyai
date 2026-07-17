import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'
import { sanitizeError } from '@/lib/sanitize-error'

const createTaskSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  deadline: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  parent_task_id: z.string().optional().nullable(),
  assignedTo: z.array(z.string()).optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200')))
    const offset = (page - 1) * pageSize
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('project_id') || searchParams.get('projectId')
    const parentTaskId = searchParams.get('parent_task_id') || searchParams.get('parentTaskId')

    const appRole = normalizeRole(role)
    const scope = getDataScope('tasks', appRole)

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('createdAt', { ascending: true })
      .range(offset, offset + pageSize - 1)

    // Filtrar por asignado si el rol no tiene acceso total
    if (scope === 'assigned') {
      query = query.contains('assignedTo', [userId])
    }

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (projectId) {
      // Dentro de un proyecto: mostrar todas las tareas de ese proyecto
      query = query.eq('projectId', projectId)
    } else if (!parentTaskId) {
      // Vista global de Tareas: solo tareas sueltas (sin proyecto asignado)
      query = query.is('projectId', null)
    }
    if (parentTaskId) query = query.eq('parentTaskId', parentTaskId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ data: [], page, pageSize, hasMore: false })
    }

    const results = data || []
    return NextResponse.json({ data: results, page, pageSize, hasMore: results.length === pageSize })
  } catch (err) {
    console.error('Error in GET /api/tasks:', err)
    return NextResponse.json({ data: [], page: 1, pageSize: 50, hasMore: false })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const result = createTaskSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const parsed = result.data

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        projectId: parsed.projectId || parsed.project_id || null,
        parentTaskId: parsed.parentTaskId || parsed.parent_task_id || null,
        title: parsed.title,
        description: parsed.description || null,
        status: parsed.status || 'pending',
        priority: parsed.priority || 'medium',
        deadline: parsed.deadline || parsed.due_date || null,
        assignedTo: parsed.assignedTo || [],
        createdById: userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'POST /api/tasks') }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/tasks:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
