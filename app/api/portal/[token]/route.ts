import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: access, error } = await supabase
    .from('client_portal_access')
    .select('*, clients(id, name, company, email), workspaces(id, name, logo_url)')
    .eq('access_token', token)
    .single()

  if (error || !access) {
    return NextResponse.json({ error: 'Token invalido o expirado' }, { status: 404 })
  }

  // Update last access
  await supabase
    .from('client_portal_access')
    .update({ last_access: new Date().toISOString() })
    .eq('id', access.id)

  return NextResponse.json({ data: access })
}
