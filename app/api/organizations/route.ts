import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth

    return NextResponse.json({ error: 'Use onboarding to create a workspace' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
