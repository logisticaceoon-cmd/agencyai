import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('time_entries')
      .select('duration_minutes, billable, client_id, project_id, user_id, clients(name), projects(name)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'stopped')

    if (from) query = query.gte('start_time', from)
    if (to) query = query.lte('start_time', to)
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Error al cargar resumen' }, { status: 500 })

    const entries = data || []
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration_minutes || 0), 0)

    // Group by client
    const byClient: Record<string, { name: string; minutes: number }> = {}
    for (const e of entries) {
      const cid = e.client_id || 'sin_cliente'
      const cname = (e.clients as unknown as { name: string } | null)?.name || 'Sin cliente'
      if (!byClient[cid]) byClient[cid] = { name: cname, minutes: 0 }
      byClient[cid].minutes += e.duration_minutes || 0
    }

    // Group by project
    const byProject: Record<string, { name: string; minutes: number }> = {}
    for (const e of entries) {
      const pid = e.project_id || 'sin_proyecto'
      const pname = (e.projects as unknown as { name: string } | null)?.name || 'Sin proyecto'
      if (!byProject[pid]) byProject[pid] = { name: pname, minutes: 0 }
      byProject[pid].minutes += e.duration_minutes || 0
    }

    return NextResponse.json({
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      billableMinutes,
      billableHours: Math.round(billableMinutes / 60 * 10) / 10,
      nonBillableMinutes: totalMinutes - billableMinutes,
      byClient: Object.values(byClient).sort((a, b) => b.minutes - a.minutes),
      byProject: Object.values(byProject).sort((a, b) => b.minutes - a.minutes),
      entryCount: entries.length,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
