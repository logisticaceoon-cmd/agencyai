import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('minutes')
      .select('*')
      .eq('workspace_id', organizationId)
      .order('meeting_date', { ascending: false })
      .limit(limit)

    if (clientId) query = query.eq('client_id', clientId)
    if (projectId) query = query.eq('project_id', projectId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      console.error('Cowork minutas GET error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { minutas: data || [], total: data?.length || 0 },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork minutas GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('minutes')
      .insert({
        workspace_id: organizationId,
        title: body.title,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        meeting_date: body.meeting_date || new Date().toISOString(),
        participants: body.participants || [],
        meeting_type: body.meeting_type || 'followup',
        agenda: body.agenda || [],
        discussion_points: body.discussion_points || null,
        decisions: body.decisions || [],
        action_items: body.action_items || [],
        status: body.status || 'draft',
        created_by: body.created_by || 'cowork-api',
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork minutas POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { minuta: data, message: 'Minuta created successfully' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork minutas POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
