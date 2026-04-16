import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { data, error } = await supabase
      .from('organization_members')
      .select('id, userId, role, status, createdAt')
      .eq('organizationId', organizationId)
      .eq('status', 'active')

    if (error) {
      console.error('Cowork team GET error:', error)
      return NextResponse.json({ error: `Error fetching team: ${error.message}` }, { status: 500 })
    }

    // Enrich with user info
    const userIds = (data || []).map((m) => m.userId).filter(Boolean)
    let users: Record<string, { email: string; fullName: string }> = {}

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, fullName')
        .in('id', userIds)

      if (usersData) {
        users = Object.fromEntries(usersData.map((u) => [u.id, { email: u.email, fullName: u.fullName }]))
      }
    }

    const members = (data || []).map((m) => ({
      id: m.id,
      user_id: m.userId,
      role: m.role,
      status: m.status,
      email: users[m.userId]?.email || null,
      full_name: users[m.userId]?.fullName || null,
    }))

    return NextResponse.json({
      success: true,
      data: { members, total: members.length },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork team GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
