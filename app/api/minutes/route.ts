import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const appRole = normalizeRole(role)
    const scope = getDataScope('clients', appRole)

    // Para trafficker: solo minutas de sus clientes asignados o que crearon
    let allowedClientIds: string[] | null = null
    if (scope === 'assigned') {
      const { data: assignments } = await supabase
        .from('member_client_assignments')
        .select('client_id')
        .eq('workspace_id', workspaceId)
        .eq('member_user_id', userId)

      const fromAssignments = (assignments || []).map((a: { client_id: string }) => a.client_id)

      const { data: myProjects } = await supabase
        .from('projects')
        .select('clientId')
        .eq('workspace_id', workspaceId)
        .eq('owner_id', userId)
        .not('clientId', 'is', null)

      const fromProjects = (myProjects || []).map((p: { clientId: string }) => p.clientId).filter(Boolean)
      allowedClientIds = [...new Set([...fromAssignments, ...fromProjects])]
    }

    let query = supabase
      .from('minutes')
      .select('*, clients!minutes_client_id_fkey(name)')
      .eq('workspace_id', workspaceId)
      .order('meeting_date', { ascending: false, nullsFirst: false })

    // Trafficker: ver sus minutas + las de sus clientes
    if (scope === 'assigned') {
      if (allowedClientIds && allowedClientIds.length > 0) {
        query = query.or(`created_by.eq.${userId},client_id.in.(${allowedClientIds.join(',')})`) as typeof query
      } else {
        query = query.eq('created_by', userId) as typeof query
      }
    }

    if (search) {
      const s = search.replace(/[%_\\]/g, '\\$&')
      query = query.ilike('title', `%${s}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      // Fallback: try without the join if foreign key name differs
      let fallbackQuery = supabase
        .from('minutes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('meeting_date', { ascending: false, nullsFirst: false })

      if (search) {
        fallbackQuery = fallbackQuery.ilike('title', `%${search}%`)
      }
      if (status) {
        fallbackQuery = fallbackQuery.eq('status', status)
      }

      const { data: fallbackData } = await fallbackQuery

      const mapped = (fallbackData || []).map((m: Record<string, unknown>) => ({
        ...m,
        client_name: null,
      }))

      return NextResponse.json({ data: mapped })
    }

    const mapped = (data || []).map((m: Record<string, unknown>) => {
      const clients = m.clients as { name: string } | null
      return {
        ...m,
        client_name: clients?.name || null,
        clients: undefined,
      }
    })

    return NextResponse.json({ data: mapped })
  } catch (err) {
    console.error('Error fetching minutes:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('minutes')
      .insert({
        workspace_id: workspaceId,
        title: body.title,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        meeting_date: body.meeting_date || null,
        participants: body.participants || [],
        meeting_type: body.meeting_type || 'followup',
        agenda: [],
        discussion_points: '',
        decisions: [],
        action_items: [],
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error en la solicitud' }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error creating minute:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
