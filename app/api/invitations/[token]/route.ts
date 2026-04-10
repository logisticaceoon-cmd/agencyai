import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    const { data: invitation } = await supabase
      .from('workspace_invitations')
      .select('*, workspaces(name, plan)')
      .eq('token', token)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invitation.accepted_at) return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

    return NextResponse.json({ data: invitation })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { userId, email } = auth

    const { token } = await params
    const supabase = createAdminClient()

    const { data: invitation } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invitation.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
    if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

    if (invitation.email !== email) {
      return NextResponse.json({ error: 'This invitation is for a different email address' }, { status: 403 })
    }

    // Add user to workspace
    await supabase.from('workspace_members').upsert({
      workspace_id: invitation.workspace_id,
      user_id: userId,
      role: invitation.role || 'member',
      name: email.split('@')[0],
      status: 'active',
    }, { onConflict: 'workspace_id,user_id' })

    // Mark invitation as accepted
    await supabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token)

    return NextResponse.json({ message: 'Invitation accepted', workspaceId: invitation.workspace_id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
