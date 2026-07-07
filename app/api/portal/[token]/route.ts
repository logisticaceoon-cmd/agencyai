import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: access, error } = await supabase
    .from('client_portal_access')
    .select('*, clients(id, name, company, email, portal_token_expires_at), workspaces(id, name, logo_url)')
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

  return NextResponse.json({ data: access })
}
