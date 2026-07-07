import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const platform = searchParams.get('platform')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('ad_spend_records')
      .select('*, clients(id, name)')
      .eq('workspace_id', workspaceId)
      .order('period_start', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (platform) query = query.eq('platform', platform)
    if (from) query = query.gte('period_start', from)
    if (to) query = query.lte('period_end', to)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching ad spend:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/ad-spend:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const allowedFields = [
      'client_id', 'platform', 'campaign_name', 'amount', 'currency',
      'period_start', 'period_end', 'roas', 'impressions', 'clicks',
      'conversions', 'cpa', 'ctr', 'notes',
    ]

    const record: Record<string, unknown> = {
      workspace_id: workspaceId,
      created_by: userId,
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) record[field] = body[field]
    }

    if (!record.client_id || !record.platform || !record.period_start || !record.period_end) {
      return NextResponse.json(
        { error: 'Campos requeridos: client_id, platform, period_start, period_end' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ad_spend_records')
      .insert(record)
      .select('*, clients(id, name)')
      .single()

    if (error) {
      console.error('Error creating ad spend:', error)
      return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/ad-spend:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
