import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  let query = supabase
    .from('kpis')
    .select('*, clients(id, name), kpi_records(id, value, period_start, period_end, notes, recorded_at)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('kpis')
      .insert({
        workspace_id: workspaceId,
        client_id: body.client_id,
        name: body.name,
        description: body.description,
        unit: body.unit || 'numero',
        target_value: body.target_value,
        current_value: body.current_value || 0,
        frequency: body.frequency || 'monthly',
        category: body.category || 'performance',
        color: body.color || '#2563eb',
      })
      .select('*, clients(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
