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

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 401 })

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const { data, error } = await supabase
    .from('portal_activity')
    .select('id, action, entity_type, entity_id, created_at')
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al obtener actividad' }, { status: 500 })
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

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 401 })

  const body = await request.json()
  const { action, entity_type, entity_id } = body

  if (!action) {
    return NextResponse.json({ error: 'action es requerido' }, { status: 400 })
  }

  const { error } = await supabase.from('portal_activity').insert({
    workspace_id: access.workspace_id,
    client_id: access.client_id,
    portal_token: token,
    action,
    entity_type: entity_type || null,
    entity_id: entity_id || null,
  })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al registrar actividad' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
