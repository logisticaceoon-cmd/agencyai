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

  const url = new URL(request.url)
  const reportId = url.searchParams.get('report_id')

  if (!reportId) {
    return NextResponse.json({ error: 'report_id es requerido' }, { status: 400 })
  }

  // Verify report belongs to this client
  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('id', reportId)
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('entity_type', 'report')
    .eq('entity_id', reportId)
    .eq('workspace_id', access.workspace_id)
    .order('created_at', { ascending: true })

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
    .select('client_id, workspace_id, clients(name)')
    .eq('access_token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 404 })

  const body = await request.json()
  const { report_id, content } = body

  if (!report_id || !content) {
    return NextResponse.json({ error: 'report_id y content son requeridos' }, { status: 400 })
  }

  // Verify report belongs to this client
  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('id', report_id)
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  }

  const clientData = access.clients as unknown as { name: string } | null

  const { data, error } = await supabase
    .from('comments')
    .insert({
      workspace_id: access.workspace_id,
      entity_type: 'report',
      entity_id: report_id,
      content,
      author_name: clientData?.name || 'Cliente',
      is_client_comment: true,
      portal_token: token,
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 })
  }

  // Log activity
  await supabase.from('portal_activity').insert({
    workspace_id: access.workspace_id,
    client_id: access.client_id,
    portal_token: token,
    action: 'added_comment',
    entity_type: 'report',
    entity_id: report_id,
  })

  return NextResponse.json({ data })
}
