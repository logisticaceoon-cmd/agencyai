import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    let query = supabase
      .from('minutes')
      .select('*, clients!minutes_client_id_fkey(name)')
      .eq('workspace_id', workspaceId)
      .order('meeting_date', { ascending: false, nullsFirst: false })

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      // Fallback: try without the join if foreign key name differs
      let fallbackQuery = supabase
        .from('minutes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('meeting_date', { ascending: false, nullsFirst: false })

      if (search) {
        fallbackQuery = fallbackQuery.ilike('title', `%${search}%`)
      }
      if (status) {
        fallbackQuery = fallbackQuery.eq('status', status)
      }

      const { data: fallbackData } = await fallbackQuery

      const mapped = (fallbackData || []).map((m: Record<string, unknown>) => ({
        ...m,
        client_name: null,
      }))

      return NextResponse.json({ data: mapped })
    }

    const mapped = (data || []).map((m: Record<string, unknown>) => {
      const clients = m.clients as { name: string } | null
      return {
        ...m,
        client_name: clients?.name || null,
        clients: undefined,
      }
    })

    return NextResponse.json({ data: mapped })
  } catch (err) {
    console.error('Error fetching minutes:', err)
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
      .from('minutes')
      .insert({
        workspace_id: workspaceId,
        title: body.title,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        meeting_date: body.meeting_date || null,
        participants: body.participants || [],
        meeting_type: body.meeting_type || 'followup',
        agenda: [],
        discussion_points: '',
        decisions: [],
        action_items: [],
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error creating minute:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
