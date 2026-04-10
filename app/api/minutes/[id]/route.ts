import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params

    const { data, error } = await supabase
      .from('minutes')
      .select('*, clients!minutes_client_id_fkey(name), projects!minutes_project_id_fkey(name)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('minutes')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()

      if (fallbackError) {
        return NextResponse.json({ error: 'Minute not found' }, { status: 404 })
      }

      return NextResponse.json({
        data: { ...fallbackData, client_name: null, project_name: null },
      })
    }

    const clients = data.clients as { name: string } | null
    const projects = data.projects as { name: string } | null

    return NextResponse.json({
      data: {
        ...data,
        client_name: clients?.name || null,
        project_name: projects?.name || null,
        clients: undefined,
        projects: undefined,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.meeting_date !== undefined) updateData.meeting_date = body.meeting_date
    if (body.participants !== undefined) updateData.participants = body.participants
    if (body.meeting_type !== undefined) updateData.meeting_type = body.meeting_type
    if (body.agenda !== undefined) updateData.agenda = body.agenda
    if (body.discussion_points !== undefined) updateData.discussion_points = body.discussion_points
    if (body.decisions !== undefined) updateData.decisions = body.decisions
    if (body.action_items !== undefined) updateData.action_items = body.action_items
    if (body.status !== undefined) updateData.status = body.status
    if (body.client_id !== undefined) updateData.client_id = body.client_id
    if (body.project_id !== undefined) updateData.project_id = body.project_id

    const { data, error } = await supabase
      .from('minutes')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params

    const { error } = await supabase
      .from('minutes')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
