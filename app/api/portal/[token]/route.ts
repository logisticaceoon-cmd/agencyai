import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: access, error } = await supabase
    .from('client_portal_access')
    .select('*, clients(id, name, company, email, portal_token_expires_at), workspaces(id, name, logo_url, primary_color, portal_welcome_message)')
    .eq('access_token', token)
    .single()

  if (error || !access) {
    return NextResponse.json({ error: 'Token invalido o expirado' }, { status: 404 })
  }

  // Verificar expiración del token
  if (access.expires_at && new Date(access.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
  }

  // Verificar expiración en la tabla clients (portal_token_expires_at)
  const client = access.clients as { id: string; name: string; portal_token_expires_at?: string } | null
  if (client?.portal_token_expires_at && new Date(client.portal_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
  }

  // Update last access
  await supabase
    .from('client_portal_access')
    .update({ last_access: new Date().toISOString() })
    .eq('id', access.id)

  // Fetch counts for dashboard cards
  const clientId = access.client_id
  const workspaceId = access.workspace_id

  const [projectsRes, reportsRes, invoicesRes, deliverablesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'sent'),
    supabase
      .from('invoices')
      .select('id, total')
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId)
      .in('status', ['sent', 'overdue']),
    supabase
      .from('deliverables')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId)
      .eq('portal_visible', true)
      .eq('status', 'pending'),
  ])

  const unpaidInvoices = invoicesRes.data || []
  const unpaidTotal = unpaidInvoices.reduce((sum: number, inv: { total: number }) => sum + Number(inv.total || 0), 0)

  const counts = {
    active_projects: projectsRes.count || 0,
    reports: reportsRes.count || 0,
    unpaid_invoices: unpaidInvoices.length,
    unpaid_total: unpaidTotal,
    pending_deliverables: deliverablesRes.count || 0,
  }

  // Log activity
  await supabase.from('portal_activity').insert({
    workspace_id: workspaceId,
    client_id: clientId,
    portal_token: token,
    action: 'viewed_portal',
    entity_type: 'portal',
  })

  return NextResponse.json({ data: { ...access, counts } })
}
