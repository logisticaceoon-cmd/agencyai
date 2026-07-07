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

  const permissions = (access.permissions as Record<string, boolean>) || {}
  if (!permissions.invoices) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { data, error } = await supabase
    .from('invoices')
    .select('id, number, status, total, currency, issue_date, due_date, items, notes')
    .eq('client_id', access.client_id)
    .eq('workspace_id', access.workspace_id)
    .in('status', ['sent', 'paid', 'overdue'])
    .order('createdAt', { ascending: false })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
  return NextResponse.json({ data })
}
