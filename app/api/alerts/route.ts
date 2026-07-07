import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export interface Alert {
  id: string
  type: 'task_overdue' | 'task_due_today' | 'task_due_soon' | 'client_inactive'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  entity_type: string
  entity_id: string
  entity_name: string
  created_at: string
  due_date?: string | null
}

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const alerts: Alert[] = []
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const soonDate = new Date(now)
    soonDate.setDate(soonDate.getDate() + 2)

    // ── Tareas vencidas ────────────────────────────────────────────────
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, deadline, status')
      .eq('workspace_id', workspaceId)
      .lt('deadline', now.toISOString())
      .not('status', 'in', '(completed,cancelled)')
      .is('deleted_at', null)
      .order('deadline', { ascending: true })
      .limit(20)

    if (overdueTasks) {
      for (const task of overdueTasks) {
        if (!task.deadline) continue
        const deadlineDate = new Date(task.deadline)
        const diffDays = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `overdue-${task.id}`,
          type: 'task_overdue',
          severity: diffDays >= 3 ? 'critical' : 'high',
          title: `Tarea vencida hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
          description: task.title,
          entity_type: 'task',
          entity_id: task.id,
          entity_name: task.title,
          created_at: now.toISOString(),
          due_date: task.deadline,
        })
      }
    }

    // ── Tareas que vencen hoy ──────────────────────────────────────────
    const { data: dueTodayTasks } = await supabase
      .from('tasks')
      .select('id, title, deadline, status')
      .eq('workspace_id', workspaceId)
      .gte('deadline', todayStr + 'T00:00:00.000Z')
      .lte('deadline', todayStr + 'T23:59:59.999Z')
      .not('status', 'in', '(completed,cancelled)')
      .is('deleted_at', null)
      .order('deadline', { ascending: true })
      .limit(10)

    if (dueTodayTasks) {
      for (const task of dueTodayTasks) {
        alerts.push({
          id: `due-today-${task.id}`,
          type: 'task_due_today',
          severity: 'high',
          title: 'Vence hoy',
          description: task.title,
          entity_type: 'task',
          entity_id: task.id,
          entity_name: task.title,
          created_at: now.toISOString(),
          due_date: task.deadline,
        })
      }
    }

    // ── Tareas que vencen en 2 días ────────────────────────────────────
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: dueSoonTasks } = await supabase
      .from('tasks')
      .select('id, title, deadline, status')
      .eq('workspace_id', workspaceId)
      .gte('deadline', tomorrowStr + 'T00:00:00.000Z')
      .lte('deadline', soonDate.toISOString())
      .not('status', 'in', '(completed,cancelled)')
      .is('deleted_at', null)
      .order('deadline', { ascending: true })
      .limit(10)

    if (dueSoonTasks) {
      for (const task of dueSoonTasks) {
        alerts.push({
          id: `due-soon-${task.id}`,
          type: 'task_due_soon',
          severity: 'medium',
          title: 'Vence en 2 días',
          description: task.title,
          entity_type: 'task',
          entity_id: task.id,
          entity_name: task.title,
          created_at: now.toISOString(),
          due_date: task.deadline,
        })
      }
    }

    // Ordenar: crítico primero, luego por fecha
    alerts.sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      const diff = severityOrder[a.severity] - severityOrder[b.severity]
      if (diff !== 0) return diff
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return 0
    })

    return NextResponse.json({ data: alerts, total: alerts.length })
  } catch (err) {
    console.error('Error fetching alerts:', err)
    return NextResponse.json({ data: [], total: 0 })
  }
}
