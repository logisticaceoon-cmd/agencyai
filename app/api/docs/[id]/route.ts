import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('docs')
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, fullName } = auth

    const body = await request.json()

    // Get current version
    const { data: existing } = await supabase
      .from('docs')
      .select('version')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    const updateData: Record<string, unknown> = {
      ...body,
      version: (existing?.version || 0) + 1,
      version_notes: body.versionNotes || `Actualizado por ${fullName}`,
      updated_at: new Date().toISOString(),
    }
    delete updateData.versionNotes

    const { data, error } = await supabase
      .from('docs')
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
