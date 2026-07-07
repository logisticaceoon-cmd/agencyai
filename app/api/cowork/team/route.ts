import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { data, error } = await supabase
      .from('workspace_members')
      .select('id, user_id, role, status, email, name, created_at')
      .eq('workspace_id', organizationId)
      .eq('status', 'active')

    if (error) {
      console.error('Cowork team GET error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Enrich with full name from users table where available
    const userIds = (data || []).map((m) => m.user_id).filter(Boolean)
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
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      email: m.email || users[m.user_id]?.email || null,
      full_name: users[m.user_id]?.fullName || m.name || null,
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

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: organizationId,
        user_id: body.user_id || `cowork-${Date.now()}`,
        role: body.role || 'member',
        email: body.email,
        name: body.name || null,
        avatar_url: body.avatar_url || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork team POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { member: data, message: 'Member added successfully' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork team POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
