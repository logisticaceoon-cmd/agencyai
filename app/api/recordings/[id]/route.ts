import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params

    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data })
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
    if (body.url !== undefined) updateData.url = body.url
    if (body.platform !== undefined) updateData.platform = body.platform
    if (body.duration !== undefined) updateData.duration = body.duration
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.participants !== undefined) updateData.participants = body.participants

    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
