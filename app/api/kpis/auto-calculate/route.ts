import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const results: Record<string, number> = {}

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Run all queries in parallel for performance
    const [
      clientsRes,
      tasksCompletedRes,
      projectsRes,
      incomeRes,
      totalTasksRes,
    ] = await Promise.all([
      // Clientes activos: COUNT clients where status='active'
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .is('deleted_at', null),

      // Tareas completadas por periodo: COUNT tasks where status='done' in current month
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .gte('updatedAt', monthStart)
        .lte('updatedAt', monthEnd),

      // Proyectos activos: COUNT projects where status='active'
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active'),

      // Ingresos mensuales (from transactions)
      supabase
        .from('transactions')
        .select('amount')
        .eq('workspace_id', workspaceId)
        .eq('type', 'income')
        .gte('date', monthStart)
        .lte('date', monthEnd),

      // Total tasks with deadline for compliance calculation
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .not('deadline', 'is', null),
    ])

    results['Clientes activos'] = clientsRes.count || 0
    results['Tareas completadas por periodo'] = tasksCompletedRes.count || 0
    results['Proyectos activos'] = projectsRes.count || 0

    if (incomeRes.data) {
      results['Ingresos mensuales'] = incomeRes.data.reduce(
        (sum: number, t: { amount: number }) => sum + Number(t.amount || 0),
        0
      )
    }

    // Deadline compliance: tasks completed before deadline / total completed with deadline
    const totalWithDeadline = totalTasksRes.count || 0
    if (totalWithDeadline > 0) {
      const { count: onTimeCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .not('deadline', 'is', null)
        .gte('deadline', now.toISOString().split('T')[0])

      results['Tasa de cumplimiento de deadlines'] = Math.round(
        ((onTimeCount || 0) / totalWithDeadline) * 100
      )
    }

    return NextResponse.json({ data: results })
  } catch (err) {
    console.error('Error in GET /api/kpis/auto-calculate:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
