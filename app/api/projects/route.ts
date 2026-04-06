import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(200)
      .order('createdAt', { ascending: false })

    if (clientId) query = query.eq('clientId', clientId)
    if (status) query = query.eq('status', status)

    const { data: projects, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: projects || [] })
  } catch (err) {
    console.error('Error in GET /api/projects:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        clientId: body.clientId || null,
        name: body.name,
        description: body.description || null,
        status: body.status || 'active',
        color: body.color || '#2563eb',
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        budget: body.budget || null,
        owner_id: body.ownerId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/projects:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
