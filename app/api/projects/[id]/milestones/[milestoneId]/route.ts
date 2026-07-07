import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { milestoneId } = await params

    const body = await request.json()

    const updateData: Record<string, unknown> = { ...body }

    // If toggling completed, set completed_at accordingly
    if (typeof body.completed === 'boolean') {
      updateData.completed_at = body.completed ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('project_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error || !data) {
      console.error('Error updating milestone:', error)
      return NextResponse.json({ error: 'Milestone no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PATCH /api/projects/[id]/milestones/[milestoneId]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { milestoneId } = await params

    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Error deleting milestone:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/projects/[id]/milestones/[milestoneId]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
