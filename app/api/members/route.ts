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

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
