import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Fetch records separately
    const { data: records } = await supabase
      .from('kpi_records')
      .select('id, value, period_start, period_end, notes, recorded_at')
      .eq('kpi_id', id)
      .order('recorded_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: { kpi: { ...data, records: records || [] } },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork kpi GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    // Check if this is a record value update
    if (body.record_value !== undefined) {
      // Insert a new kpi_record
      const { data: record, error: recErr } = await supabase
        .from('kpi_records')
        .insert({
          kpi_id: id,
          value: body.record_value,
          period_start: body.period_start || null,
          period_end: body.period_end || null,
          notes: body.record_notes || null,
        })
        .select()
        .single()

      if (recErr) {
        console.error(recErr)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
      }

      // Update current_value on the KPI
      await supabase
        .from('kpis')
        .update({ current_value: body.record_value })
        .eq('id', id)
        .eq('workspace_id', organizationId)

      return NextResponse.json({
        success: true,
        data: { record, message: 'KPI record added and current value updated' },
        timestamp: new Date().toISOString(),
      })
    }

    // Regular KPI metadata update
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.unit !== undefined) updates.unit = body.unit
    if (body.target_value !== undefined) updates.target_value = body.target_value
    if (body.current_value !== undefined) updates.current_value = body.current_value
    if (body.frequency !== undefined) updates.frequency = body.frequency
    if (body.category !== undefined) updates.category = body.category
    if (body.color !== undefined) updates.color = body.color
    if (body.client_id !== undefined) updates.client_id = body.client_id

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('kpis')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork kpi PATCH error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { kpi: data, message: 'KPI updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork kpi PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('kpis')
      .delete()
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select('id, name')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { message: `KPI "${data.name}" deleted`, id: data.id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork kpi DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
