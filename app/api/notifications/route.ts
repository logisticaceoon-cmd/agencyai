import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter')

    // The notifications table uses Prisma camelCase columns
    // "userId" is the Prisma column, "user_id" is the new Supabase column
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .or(`"userId".eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (filter === 'unread') query = query.or(`"isRead".eq.false,read.eq.false`)

    const { data, error, count } = await query
    if (error) {
      console.error('Notifications error:', error)
      return NextResponse.json({ notifications: [], unreadCount: 0, total: 0, page, limit })
    }

    return NextResponse.json({
      notifications: (data || []).map((n: Record<string, unknown>) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead ?? n.read ?? false,
        link: n.link || null,
        relatedEntityType: n.relatedEntityType || n.type,
        relatedEntityId: n.relatedEntityId || null,
        createdAt: n.createdAt || n.created_at,
      })),
      unreadCount: (data || []).filter((n: Record<string, unknown>) => !(n.isRead ?? n.read)).length,
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('Error in GET /api/notifications:', err)
    return NextResponse.json({ notifications: [], unreadCount: 0, total: 0, page: 1, limit: 20 })
  }
}
