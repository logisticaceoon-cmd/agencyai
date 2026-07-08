import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: access } = await supabase
    .from('client_portal_access')
    .select('client_id, workspace_id, permissions')
    .eq('access_token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Token invalido' }, { status: 404 })

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, title, description, file_url, file_type, status, reviewed_at, review_notes, created_at, project_id, projects(name)')
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .eq('portal_visible', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Log activity
  await supabase.from('portal_activity').insert({
    workspace_id: access.workspace_id,
    client_id: access.client_id,
    portal_token: token,
    action: 'viewed_deliverables',
    entity_type: 'deliverable',
  })

  return NextResponse.json({ data })
}
