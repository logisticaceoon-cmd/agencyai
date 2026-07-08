import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const { locale } = await request.json()
    if (!locale || !['es', 'en'].includes(locale)) {
      return NextResponse.json({ error: 'Locale invalido' }, { status: 400 })
    }

    await supabase
      .from('workspace_members')
      .update({ locale })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Locale update error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
