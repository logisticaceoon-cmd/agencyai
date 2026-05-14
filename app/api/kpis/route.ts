import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    const appRole = normalizeRole(role)
    const scope = getDataScope('kpis', appRole)

    let query = supabase
      .from('kpis')
      .select('*, kpi_records(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    // Trafficker/viewer: solo ven sus propios KPIs
    if (scope === 'assigned') {
      query = query.eq('owner_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching kpis:', error)
      return NextResponse.json({ data: [] })
    }

    const kpisWithRecords = (data || []).map((kpi: Record<string, unknown>) => ({
      ...kpi,
      kpi_records: (kpi.kpi_records as unknown[]) || [],
      clients: null,
    }))

    return NextResponse.json({ data: kpisWithRecords })
  } catch (err) {
    console.error('Error in GET /api/kpis:', err)
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
      .from('kpis')
      .insert({
        workspace_id: workspaceId,
        client_id: body.client_id || null,
        name: body.name,
        description: body.description || null,
        unit: body.unit || 'numero',
        target_value: body.target_value,
        current_value: body.current_value || 0,
        frequency: body.frequency || 'monthly',
        category: body.category || 'performance',
        color: body.color || '#2563eb',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating kpi:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/kpis:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
