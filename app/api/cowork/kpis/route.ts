import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('kpis')
      .select('*')
      .eq('workspace_id', organizationId)
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (clientId) query = query.eq('client_id', clientId)
    if (category) query = query.eq('category', category)

    const { data: kpis, error } = await query

    if (error) {
      console.error('Cowork kpis GET error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Fetch records for each KPI separately (avoids PostgREST relationship cache issue)
    const kpiIds = (kpis || []).map(k => k.id)
    let records: Record<string, Array<{ id: string; value: number; period_start: string | null; period_end: string | null; notes: string | null; recorded_at: string }>> = {}

    if (kpiIds.length > 0) {
      const { data: allRecords } = await supabase
        .from('kpi_records')
        .select('id, kpi_id, value, period_start, period_end, notes, recorded_at')
        .in('kpi_id', kpiIds)
        .order('recorded_at', { ascending: false })

      if (allRecords) {
        for (const r of allRecords) {
          if (!records[r.kpi_id]) records[r.kpi_id] = []
          records[r.kpi_id].push({
            id: r.id,
            value: r.value,
            period_start: r.period_start,
            period_end: r.period_end,
            notes: r.notes,
            recorded_at: r.recorded_at,
          })
        }
      }
    }

    const kpisWithRecords = (kpis || []).map(k => ({
      ...k,
      records: records[k.id] || [],
    }))

    return NextResponse.json({
      success: true,
      data: { kpis: kpisWithRecords, total: kpisWithRecords.length },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork kpis GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('kpis')
      .insert({
        workspace_id: organizationId,
        client_id: body.client_id || null,
        name: body.name,
        description: body.description || null,
        unit: body.unit || 'numero',
        target_value: body.target_value || null,
        current_value: body.current_value || 0,
        frequency: body.frequency || 'monthly',
        category: body.category || 'performance',
        color: body.color || '#2563eb',
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork kpis POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { kpi: data, message: 'KPI created successfully' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork kpis POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
