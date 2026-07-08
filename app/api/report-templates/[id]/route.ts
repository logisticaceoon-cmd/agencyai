import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('report_templates')
      .select('*, clients(id, name, email)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Fetch reports generated from this template
    const { data: generatedReports } = await supabase
      .from('reports')
      .select('id, title, status, "createdAt"')
      .eq('template_id', id)
      .eq('workspace_id', workspaceId)
      .order('createdAt', { ascending: false })
      .limit(20)

    return NextResponse.json({ data: { ...data, generated_reports: generatedReports || [] } })
  } catch (err) {
    console.error('Error in GET /api/report-templates/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    const allowedFields = [
      'name', 'description', 'report_type', 'sections',
      'is_scheduled', 'schedule_frequency', 'schedule_day',
      'auto_send', 'client_id',
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    // Recalculate next_generation_at if schedule changed
    if ('is_scheduled' in body || 'schedule_frequency' in body || 'schedule_day' in body) {
      const isScheduled = body.is_scheduled ?? true
      const frequency = body.schedule_frequency
      const day = body.schedule_day ?? 1

      if (isScheduled && frequency) {
        updates.next_generation_at = calculateNextGeneration(frequency, day)
      } else if (!isScheduled) {
        updates.next_generation_at = null
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('report_templates')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name, email)')
      .single()

    if (error) {
      console.error('Error updating report template:', error)
      return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PATCH /api/report-templates/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Error deleting report template:', error)
      return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/report-templates/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function calculateNextGeneration(frequency: string, day: number): string {
  const now = new Date()
  const next = new Date(now)

  switch (frequency) {
    case 'weekly': {
      const targetDay = day % 7
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      next.setDate(now.getDate() + daysUntil)
      next.setHours(7, 0, 0, 0)
      break
    }
    case 'biweekly': {
      const targetDay = day % 7
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 14
      next.setDate(now.getDate() + daysUntil)
      next.setHours(7, 0, 0, 0)
      break
    }
    case 'monthly': {
      const targetDayOfMonth = Math.min(Math.max(day, 1), 28)
      if (now.getDate() >= targetDayOfMonth) {
        next.setMonth(now.getMonth() + 1)
      }
      next.setDate(targetDayOfMonth)
      next.setHours(7, 0, 0, 0)
      break
    }
    case 'quarterly': {
      const currentMonth = now.getMonth()
      const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3
      next.setMonth(nextQuarterMonth)
      next.setDate(Math.min(Math.max(day, 1), 28))
      next.setHours(7, 0, 0, 0)
      break
    }
  }

  return next.toISOString()
}
