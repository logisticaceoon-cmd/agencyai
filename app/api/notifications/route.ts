import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId, userId } = auth

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const filter = searchParams.get('filter')

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (filter === 'unread') query = query.eq('read', false)
  if (filter === 'warning') query = query.eq('type', 'warning')
  if (filter === 'info') query = query.eq('type', 'info')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('read', false)

  return NextResponse.json({
    notifications: (data || []).map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.read,
      link: n.link,
      relatedEntityType: n.type,
      relatedEntityId: null,
      createdAt: n.created_at,
    })),
    unreadCount: unreadCount || 0,
    total: count || 0,
    page,
    limit,
  })
}
