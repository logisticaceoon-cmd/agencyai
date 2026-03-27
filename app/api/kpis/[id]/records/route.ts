import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  try {
    const body = await request.json()

    // Verify KPI belongs to workspace
    const { data: kpi } = await supabase
      .from('kpis')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!kpi) return NextResponse.json({ error: 'KPI no encontrado' }, { status: 404 })

    const { data: record, error } = await supabase
      .from('kpi_records')
      .insert({
        kpi_id: id,
        value: body.value,
        period_start: body.period_start,
        period_end: body.period_end,
        notes: body.notes,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update current_value on the KPI
    await supabase.from('kpis').update({ current_value: body.value }).eq('id', id)

    return NextResponse.json({ data: record }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
