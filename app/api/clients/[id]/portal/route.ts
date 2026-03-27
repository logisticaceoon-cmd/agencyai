import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  const { data } = await supabase
    .from('client_portal_access')
    .select('*')
    .eq('client_id', id)
    .eq('workspace_id', workspaceId)
    .single()

  return NextResponse.json({ data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  try {
    const body = await request.json()

    // Delete existing access for this client
    await supabase
      .from('client_portal_access')
      .delete()
      .eq('client_id', id)
      .eq('workspace_id', workspaceId)

    const { data, error } = await supabase
      .from('client_portal_access')
      .insert({
        workspace_id: workspaceId,
        client_id: id,
        email: body.email,
        permissions: body.permissions || { projects: true, reports: true, invoices: false },
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  await supabase
    .from('client_portal_access')
    .delete()
    .eq('client_id', id)
    .eq('workspace_id', workspaceId)

  return NextResponse.json({ success: true })
}
