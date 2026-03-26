import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('minutes')
    .select('*, clients!minutes_client_id_fkey(name)')
    .eq('workspace_id', ctx.org.id)
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
    const fallbackQuery = supabase
      .from('minutes')
      .select('*')
      .eq('workspace_id', ctx.org.id)
      .order('meeting_date', { ascending: false, nullsFirst: false })

    if (search) {
      fallbackQuery.ilike('title', `%${search}%`)
    }
    if (status) {
      fallbackQuery.eq('status', status)
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery

    if (fallbackError) {
      return NextResponse.json(
        { error: fallbackError.message },
        { status: 500 }
      )
    }

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
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('minutes')
      .insert({
        workspace_id: ctx.org.id,
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
        created_by: ctx.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
