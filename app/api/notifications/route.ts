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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * pageSize

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const workspaceId = await getWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
    }

    const admin = createAdminClient()

    // Scope notifications by workspace and user
    const { data, error: notifError } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (notifError) {
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

    return NextResponse.json({ notifications, unreadCount, total: notifications.length, page, pageSize, hasMore: notifications.length === pageSize })
  } catch (err) {
    console.error('Error in GET /api/notifications:', err)
    return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
  }
}
