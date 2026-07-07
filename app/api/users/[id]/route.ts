import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.fullName !== undefined) updateData.name = body.fullName
    if (body.role !== undefined) updateData.role = body.role
    if (body.status !== undefined) updateData.status = body.status

    const { data, error } = await supabase
      .from('workspace_members')
      .update(updateData)
      .eq('user_id', id)
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
