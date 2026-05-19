import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const { id } = await params
    if (workspaceId !== id || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role: inviteRole } = body

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const { data, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: id,
        email,
        role: inviteRole || 'member',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const { id } = await params
    if (workspaceId !== id || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', id)
      .is('accepted_at', null)
      .order('createdAt', { ascending: false })

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
