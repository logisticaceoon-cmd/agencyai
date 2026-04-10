import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('user_id, name, role, status')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ data: [] })
    }

    const users = (members || []).map((m) => ({
      id: m.user_id,
      fullName: m.name || 'Usuario',
      role: m.role,
      status: m.status,
    }))

    return NextResponse.json({ data: users })
  } catch (err) {
    console.error('Error fetching users:', err)
    return NextResponse.json({ data: [] })
  }
}
