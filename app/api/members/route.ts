import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)

    // Map flat columns to the shape expected by pages (performance, tasks)
    const members = (data || []).map((row: Record<string, unknown>) => ({
      userId: row.user_id as string,
      role: row.role as string,
      status: row.status as string,
      user: {
        id: row.user_id as string,
        fullName: (row.name as string) || (row.email as string) || 'Sin nombre',
        email: (row.email as string) || '',
        avatarUrl: (row.avatar_url as string) || null,
      },
    }))

    return NextResponse.json({ data: members })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
