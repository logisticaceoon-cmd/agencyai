import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params
    const body = await request.json()

    const allowedFields = ['description', 'project_id', 'task_id', 'client_id', 'start_time', 'end_time', 'duration_minutes', 'billable', 'hourly_rate', 'status']
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const f of allowedFields) {
      if (f in body) update[f] = body[f]
    }

    // If stopping, calculate duration
    if (body.status === 'stopped' && !body.duration_minutes) {
      const { data: entry } = await supabase.from('time_entries').select('start_time').eq('id', id).single()
      if (entry) {
        update.end_time = new Date().toISOString()
        update.duration_minutes = Math.round((Date.now() - new Date(entry.start_time).getTime()) / 60000)
      }
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase.from('time_entries').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
