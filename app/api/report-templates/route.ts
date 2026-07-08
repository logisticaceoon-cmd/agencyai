import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    let query = supabase
      .from('report_templates')
      .select('*, clients(id, name, email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching report templates:', error)
      return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/report-templates:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const {
      name,
      description,
      report_type,
      sections,
      is_scheduled,
      schedule_frequency,
      schedule_day,
      auto_send,
      client_id,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Calculate next_generation_at if scheduled
    let next_generation_at: string | null = null
    if (is_scheduled && schedule_frequency) {
      next_generation_at = calculateNextGeneration(schedule_frequency, schedule_day ?? 1)
    }

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        description: description || null,
        report_type: report_type || 'monthly',
        sections: sections || [],
        is_scheduled: is_scheduled || false,
        schedule_frequency: schedule_frequency || null,
        schedule_day: schedule_day ?? null,
        auto_send: auto_send || false,
        client_id: client_id || null,
        next_generation_at,
        created_by: userId,
      })
      .select('*, clients(id, name, email)')
      .single()

    if (error) {
      console.error('Error creating report template:', error)
      return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/report-templates:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function calculateNextGeneration(frequency: string, day: number): string {
  const now = new Date()
  const next = new Date(now)

  switch (frequency) {
    case 'weekly': {
      // day = 0 (Sunday) to 6 (Saturday)
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
      // day = day of month (1-28)
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
