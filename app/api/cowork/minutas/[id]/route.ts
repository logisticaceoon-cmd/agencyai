import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('minutes')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Minuta not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { minuta: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork minuta GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.client_id !== undefined) updates.client_id = body.client_id
    if (body.project_id !== undefined) updates.project_id = body.project_id
    if (body.meeting_date !== undefined) updates.meeting_date = body.meeting_date
    if (body.participants !== undefined) updates.participants = body.participants
    if (body.meeting_type !== undefined) updates.meeting_type = body.meeting_type
    if (body.agenda !== undefined) updates.agenda = body.agenda
    if (body.discussion_points !== undefined) updates.discussion_points = body.discussion_points
    if (body.decisions !== undefined) updates.decisions = body.decisions
    if (body.action_items !== undefined) updates.action_items = body.action_items
    if (body.status !== undefined) updates.status = body.status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('minutes')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork minuta PATCH error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Minuta not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { minuta: data, message: 'Minuta updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork minuta PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('minutes')
      .delete()
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select('id, title')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Minuta not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { message: `Minuta "${data.title}" deleted`, id: data.id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork minuta DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
