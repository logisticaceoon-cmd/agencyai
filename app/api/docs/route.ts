import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('docs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) {
      // Graceful: tabla puede no existir aún
      console.error('Error fetching docs:', error.message)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error fetching docs:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    if (!body.title) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('docs')
      .insert({
        workspace_id: workspaceId,
        title: body.title,
        content: body.content || null,
        category: body.category || 'general',
        status: body.status || 'draft',
        author_id: userId,
        version: 1,
        version_notes: 'Versión inicial',
        tags: body.tags || [],
        external_url: body.external_url || null,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating doc:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error creating doc:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
