import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    // Mark all notifications for this user in this workspace as read
    // Using safe parameterized filter (user.id comes from auth, not user input)
    await supabase
      .from('notifications')
      .update({ isRead: true, read: true, readAt: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .or(`"userId".eq.${userId},user_id.eq.${userId}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
