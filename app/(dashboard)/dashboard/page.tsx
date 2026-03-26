'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Avatar } from '@/components/shared/Avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { deadlineCountdown, cn, formatDate } from '@/lib/utils'
import {
  Users, CheckSquare, FileText, AlertTriangle,
  TrendingUp, Plus, ArrowRight, Clock, DollarSign,
  Target, BarChart2, Zap, Bell, Calendar
} from 'lucide-react'

interface DashboardSummary {
  totalClients: number
  clientsOnTrack: number
  tasksTotal: number
  tasksCompleted: number
  tasksOverdue: number
  reportsTotal: number
  reportsProcessed: number
  reportsPending: number
  complianceScore: number
  monthlyRevenue: number
  pendingPayments: number
}

interface TeamMember {
  user: { id: string; fullName: string; avatarUrl: string | null; department: string | null }
  tasksAssigned: number
  tasksCompleted: number
  workloadPercent: number
  status: 'on_track' | 'monitor' | 'overloaded'
}

interface Alert {
  overdueTasks: Array<{ id: string; title: string; deadline: string; priority: string }>
  pendingReports: Array<{ id: string; title: string; createdAt: string }>
  overdueReportsCount: number
}

const statusLabels = {
  on_track: { label: 'OK', class: 'text-green-400 bg-green-500/10 border-green-500/30' },
  monitor: { label: 'MONITOR', class: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  overloaded: { label: 'CARGADO', class: 'text-red-400 bg-red-500/10 border-red-500/30' },
}

export default function DashboardPage() {
  const { user } = useCurrentUser()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [alerts, setAlerts] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryRes, teamRes, alertsRes] = await Promise.all([
          fetch('/api/dashboard/summary'),
          fetch('/api/dashboard/team'),
          fetch('/api/dashboard/alerts'),
        ])
        if (summaryRes.ok) setSummary(await summaryRes.json())
        if (teamRes.ok) {
          const data = await teamRes.json()
          setTeam(data.team || [])
        }
        if (alertsRes.ok) setAlerts(await alertsRes.json())
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const isAdmin = user?.role === 'CEO' || user?.role === 'Manager'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}{user ? `, ${user.fullName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {formatDate(new Date().toISOString())} · Resumen operacional
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href="/tasks/new"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Link>
            <Link
              href="/clients"
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Users className="h-4 w-4" />
              Clientes
            </Link>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Clientes activos"
            value={`${summary.clientsOnTrack}`}
            sub={`de ${summary.totalClients} totales`}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <KpiCard
            icon={CheckSquare}
            label="Tareas completadas"
            value={`${summary.tasksCompleted}`}
            sub={`${summary.tasksOverdue > 0 ? `${summary.tasksOverdue} atrasadas` : 'al día'}`}
            subColor={summary.tasksOverdue > 0 ? 'text-red-400' : 'text-green-400'}
            color="text-green-400"
            bg="bg-green-500/10"
          />
          <KpiCard
            icon={FileText}
            label="Reportes pendientes"
            value={`${summary.reportsPending}`}
            sub={`${summary.reportsProcessed} procesados`}
            color="text-indigo-400"
            bg="bg-indigo-500/10"
          />
          <KpiCard
            icon={DollarSign}
            label="Ingresos del mes"
            value={summary.monthlyRevenue > 0 ? `$${summary.monthlyRevenue.toLocaleString()}` : '—'}
            sub={summary.pendingPayments > 0 ? `${summary.pendingPayments} pagos pendientes` : 'Al día'}
            subColor={summary.pendingPayments > 0 ? 'text-yellow-400' : 'text-green-400'}
            color="text-yellow-400"
            bg="bg-yellow-500/10"
          />
        </div>
      ) : null}

      {/* Alerts */}
      {alerts && (alerts.overdueTasks.length > 0 || alerts.overdueReportsCount > 0) && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">
              Alertas ({alerts.overdueTasks.length + (alerts.overdueReportsCount > 0 ? 1 : 0)})
            </h2>
          </div>
          <div className="space-y-1.5">
            {alerts.overdueTasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 hover:bg-red-500/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-white truncate">{task.title}</span>
                  <StatusBadge status={task.priority} />
                </div>
                <span className="text-xs text-red-400 flex-shrink-0">{deadlineCountdown(task.deadline)}</span>
              </Link>
            ))}
            {alerts.overdueReportsCount > 0 && (
              <Link
                href="/reports?status=pending"
                className="flex items-center justify-between rounded-lg bg-yellow-500/10 px-3 py-2 hover:bg-yellow-500/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-sm text-white">
                    {alerts.overdueReportsCount} reportes sin revisar
                  </span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-yellow-400" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className={cn('grid gap-5', isAdmin ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2')}>
        {/* Quick actions */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            Acciones rápidas
          </h2>
          <div className="space-y-2">
            {[
              { href: '/clients', icon: Users, label: 'Ver clientes', color: 'text-blue-400' },
              { href: '/tasks', icon: CheckSquare, label: 'Ver tareas', color: 'text-green-400' },
              { href: '/reports', icon: FileText, label: 'Ver reportes', color: 'text-indigo-400' },
              { href: '/kpis', icon: BarChart2, label: 'Ver KPIs', color: 'text-purple-400' },
              { href: '/finances', icon: DollarSign, label: 'Ver finanzas', color: 'text-yellow-400' },
              { href: '/objectives', icon: Target, label: 'Ver objetivos', color: 'text-orange-400' },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800 transition-colors group"
              >
                <Icon className={cn('h-4 w-4', color)} />
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">{label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-600 ml-auto group-hover:text-zinc-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Team status — admin only */}
        {isAdmin && (
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Estado del equipo
              </h2>
              <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Ver todo
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : team.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No hay miembros en el equipo</p>
                <Link href="/settings" className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
                  Invitar miembros
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {team.slice(0, 4).map((member) => {
                  const statusCfg = statusLabels[member.status]
                  return (
                    <Link
                      key={member.user.id}
                      href={`/tasks?assignedTo=${member.user.id}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3 hover:border-zinc-700 transition-colors"
                    >
                      <Avatar name={member.user.fullName} avatarUrl={member.user.avatarUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium text-white truncate">{member.user.fullName}</p>
                          <span className={cn('text-[10px] font-medium rounded-full border px-1.5 py-0.5 flex-shrink-0', statusCfg.class)}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              member.workloadPercent >= 95 ? 'bg-red-500' :
                              member.workloadPercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${member.workloadPercent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {member.tasksAssigned} tareas · {member.workloadPercent}%
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* My tasks — team member view */}
        {!isAdmin && (
          <>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-400" />
                Mis tareas pendientes
              </h2>
              <Link
                href="/tasks"
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                Subir reporte
              </h2>
              <Link
                href="/reports/new"
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nuevo reporte
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Recent activity row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/clients" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Clientes</p>
              <p className="text-xs text-zinc-500">Gestionar CRM</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 ml-auto transition-colors" />
          </div>
        </Link>
        <Link href="/reports" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2.5">
              <FileText className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Reportes</p>
              <p className="text-xs text-zinc-500">Mensuales y semanales</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 ml-auto transition-colors" />
          </div>
        </Link>
        <Link href="/finances" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Finanzas</p>
              <p className="text-xs text-zinc-500">Ingresos y gastos</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 ml-auto transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon, label, value, sub, color, bg, subColor
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
  bg: string
  subColor?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn('rounded-lg p-1.5', bg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className={cn('text-xs mt-0.5', subColor ?? 'text-zinc-500')}>{sub}</p>}
    </div>
  )
}
