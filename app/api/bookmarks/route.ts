import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('bookmarks')
      .select('*, clients(id, name), projects(id, name)')
      .eq('workspace_id', workspaceId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      const { data: fallback } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      return NextResponse.json({ data: fallback || [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        workspace_id: workspaceId,
        title: body.title,
        url: body.url,
        description: body.description || null,
        icon: body.icon || '\u{1F4C4}',
        color: body.color || '#2563eb',
        category: body.category || 'general',
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        pinned: body.pinned || false,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 })
  }
}
