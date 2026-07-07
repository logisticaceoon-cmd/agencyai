import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  try {
    const body = await request.json()

    const allowedFields = ['title', 'description', 'quarter', 'year', 'status', 'notes', 'client_id', 'progress']
    const sanitizedBody: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) sanitizedBody[field] = body[field]
    }

    const { data, error } = await supabase
      .from('objectives')
      .update(sanitizedBody)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name), key_results(*)')
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  const { error } = await supabase.from('objectives').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
