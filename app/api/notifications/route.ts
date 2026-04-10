import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getWorkspaceId(userId: string) {
  const admin = createAdminClient()

  const { data: ws } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (ws) return ws.id

  const { data: member } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return member?.workspace_id || null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
    }

    const workspaceId = await getWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
    }

    const admin = createAdminClient()

    // Fix: use parameterized filter instead of string interpolation
    const { data, error: notifError } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (notifError) {
      console.error('Notifications query error:', notifError)
      return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
    }

    const notifications = (data || []).map((n: Record<string, unknown>) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead ?? n.read ?? false,
      link: n.link || null,
      relatedEntityType: n.relatedEntityType || null,
      relatedEntityId: n.relatedEntityId || null,
      createdAt: n.createdAt || n.created_at,
    }))

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return NextResponse.json({ notifications, unreadCount, total: notifications.length })
  } catch (err) {
    console.error('Error in GET /api/notifications:', err)
    return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
  }
}
