import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * pageSize
    const clientId = searchParams.get('client_id')
    const projectId = searchParams.get('project_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const userId_ = searchParams.get('user_id') || userId

    let query = supabase
      .from('time_entries')
      .select('*, clients(id, name), projects(id, name)')
      .eq('workspace_id', workspaceId)
      .order('start_time', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (clientId) query = query.eq('client_id', clientId)
    if (projectId) query = query.eq('project_id', projectId)
    if (from) query = query.gte('start_time', from)
    if (to) query = query.lte('start_time', to)
    if (userId_) query = query.eq('user_id', userId_)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: 'Error al cargar entradas' }, { status: 500 })
    return NextResponse.json({ data: data || [], page, pageSize, hasMore: (data || []).length === pageSize })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    // If starting a timer, stop any running timer first
    if (body.status === 'running') {
      const { data: running } = await supabase
        .from('time_entries')
        .select('id, start_time')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('status', 'running')

      if (running && running.length > 0) {
        for (const entry of running) {
          const duration = Math.round((Date.now() - new Date(entry.start_time).getTime()) / 60000)
          await supabase.from('time_entries')
            .update({ status: 'stopped', end_time: new Date().toISOString(), duration_minutes: duration })
            .eq('id', entry.id)
        }
      }
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        project_id: body.project_id || null,
        task_id: body.task_id || null,
        client_id: body.client_id || null,
        description: body.description || '',
        start_time: body.start_time || new Date().toISOString(),
        end_time: body.end_time || null,
        duration_minutes: body.duration_minutes || null,
        billable: body.billable ?? true,
        hourly_rate: body.hourly_rate || null,
        status: body.status || 'stopped',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al crear entrada' }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
