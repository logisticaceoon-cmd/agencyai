import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { error } = await supabase
      .from('workspaces')
      .update({ onboarding_completed: true })
      .eq('id', workspaceId)

    if (error) {
      console.error('Error marking onboarding completed:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in POST /api/workspace/onboarding-completed:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
