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
      .from('workspace_members')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { member: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork team member GET error:', err)
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
    if (body.role !== undefined) updates.role = body.role
    if (body.name !== undefined) updates.name = body.name
    if (body.email !== undefined) updates.email = body.email
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url
    if (body.status !== undefined) updates.status = body.status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork team member PATCH error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { member: data, message: 'Member updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork team member PATCH error:', err)
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

    // Deactivate instead of hard delete to preserve history
    const { data, error } = await supabase
      .from('workspace_members')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .neq('role', 'owner')
      .select('id, name, email')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Member not found or cannot remove owner' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { message: `Member "${data.name || data.email}" deactivated`, id: data.id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork team member DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
