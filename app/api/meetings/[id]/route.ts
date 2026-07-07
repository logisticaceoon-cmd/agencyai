import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params

    const { data, error } = await supabase
      .from('meetings')
      .select('*, clients(id, name)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const client = data.clients as { id: string; name: string } | null
    return NextResponse.json({
      data: { ...data, client: client || null, clients: undefined, createdBy: null },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updateData.title = body.title
    if (body.summary !== undefined) updateData.summary = body.summary
    if (body.decisions !== undefined) updateData.decisions = body.decisions
    if (body.agreedTasks !== undefined) updateData.agreed_tasks = body.agreedTasks
    if (body.nextMeetingDate !== undefined) updateData.next_meeting_date = body.nextMeetingDate
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.attendees !== undefined) updateData.attendees = body.attendees

    const { data, error } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error en la solicitud' }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
