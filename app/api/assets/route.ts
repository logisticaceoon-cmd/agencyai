import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const clientId = searchParams.get('client_id')
    const projectId = searchParams.get('project_id')
    const search = searchParams.get('search')
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '50'))

    let query = supabase
      .from('assets')
      .select('*, clients(id, name), projects(id, name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) query = query.eq('category', category)
    if (clientId) query = query.eq('client_id', clientId)
    if (projectId) query = query.eq('project_id', projectId)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Assets GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { name, file_url, file_path, file_type, file_size, category, client_id, project_id, tags } = body

    if (!name || !file_url || !file_type) {
      return NextResponse.json({ error: 'name, file_url y file_type son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({
        workspace_id: workspaceId,
        name,
        file_url,
        file_path: file_path || null,
        file_type,
        file_size: file_size || 0,
        category: category || 'other',
        client_id: client_id || null,
        project_id: project_id || null,
        tags: tags || [],
        uploaded_by: userId,
      })
      .select('*, clients(id, name), projects(id, name)')
      .single()

    if (error) {
      console.error('Error creating asset:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Assets POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
