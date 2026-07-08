import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))

    let query = supabase
      .from('activity_feed')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching activity:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Activity GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { action, entity_type, entity_id, entity_name, client_id, metadata } = body

    if (!action || !entity_type) {
      return NextResponse.json({ error: 'action y entity_type son requeridos' }, { status: 400 })
    }

    // Get user name
    const { data: member } = await supabase
      .from('workspace_members')
      .select('name')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        user_name: member?.name || 'Usuario',
        action,
        entity_type,
        entity_id: entity_id || null,
        entity_name: entity_name || null,
        client_id: client_id || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating activity:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Activity POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
