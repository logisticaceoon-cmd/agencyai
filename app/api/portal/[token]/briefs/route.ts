import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: access } = await supabase
    .from('client_portal_access')
    .select('client_id, workspace_id')
    .eq('access_token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 404 })

  const { data, error } = await supabase
    .from('client_briefs')
    .select('*')
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: access } = await supabase
    .from('client_portal_access')
    .select('client_id, workspace_id')
    .eq('access_token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 404 })

  const body = await request.json()
  const { title, description, file_url, file_type, file_size } = body

  if (!title) {
    return NextResponse.json({ error: 'El titulo es requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('client_briefs')
    .insert({
      workspace_id: access.workspace_id,
      client_id: access.client_id,
      title,
      description: description || null,
      file_url: file_url || null,
      file_type: file_type || null,
      file_size: file_size || null,
      portal_token: token,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al crear brief' }, { status: 500 })
  }

  // Log activity
  await supabase.from('portal_activity').insert({
    workspace_id: access.workspace_id,
    client_id: access.client_id,
    portal_token: token,
    action: 'uploaded_brief',
    entity_type: 'brief',
    entity_id: data.id,
  })

  return NextResponse.json({ data })
}
