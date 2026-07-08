import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entity_type y entity_id son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Comments GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { entity_type, entity_id, content, parent_id, mentions } = body

    if (!entity_type || !entity_id || !content) {
      return NextResponse.json({ error: 'entity_type, entity_id y content son requeridos' }, { status: 400 })
    }

    // Get author info
    const { data: member } = await supabase
      .from('workspace_members')
      .select('name, avatar_url')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        workspace_id: workspaceId,
        entity_type,
        entity_id,
        content,
        parent_id: parent_id || null,
        author_id: userId,
        author_name: member?.name || 'Usuario',
        author_avatar: member?.avatar_url || null,
        mentions: mentions || [],
        is_client_comment: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Comments POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
