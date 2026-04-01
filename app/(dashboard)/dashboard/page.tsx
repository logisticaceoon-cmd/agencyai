'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn, formatDate } from '@/lib/utils'
import { DashboardAgent } from '@/components/ai/DashboardAgent'
import {
  Users,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  BarChart2,
  Rocket,
  TrendingUp,
  Activity,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  activeClients: number
  activeProjects: number
  tasksCompletedThisWeek: number
  tasksOverdue: number
  totalClients: number
  pendingTasks: Array<{
    id: string
    title: string
    status: string
    deadline: string
    priority: string
    client: { id: string; name: string } | null
    project: { id: string; name: string } | null
  }>
  recentClients: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos dias'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getCurrentDateTimeString(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return now.toLocaleDateString('es-ES', options)
}

function getDaysRemaining(deadline: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDaysRemainingBadge(deadline: string) {
  const days = getDaysRemaining(deadline)
  if (days < 0) {
    return {
      label: `${Math.abs(days)}d vencida`,
      color: 'bg-[var(--red-light)] text-[var(--red)]',
    }
  }
  if (days <= 3) {
    return {
      label: days === 0 ? 'Hoy' : `${days}d`,
      color: 'bg-[var(--yellow-light)] text-[var(--yellow)]',
    }
  }
  return {
    label: `${days}d`,
    color: 'bg-[var(--green-light)] text-[var(--green)]',
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  return colors[name.length % colors.length]
}

const priorityLabel: Record<string, string> = {
  critical: 'Critica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const priorityColor: Record<string, string> = {
  critical: 'bg-[var(--red-light)] text-[var(--red)]',
  high: 'bg-orange-50 text-orange-600',
  medium: 'bg-[var(--yellow-light)] text-[var(--yellow)]',
  low: 'bg-[var(--green-light)] text-[var(--green)]',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useCurrentUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [dateString, setDateString] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
    setDateString(getCurrentDateTimeString())
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          setStats(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const firstName = user?.fullName?.split(' ')[0] ?? ''
  const isFirstAccess = stats !== null && stats.totalClients === 0

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)] capitalize">
          {dateString}
        </p>
      </div>

      {/* ── First-access checklist ─────────────────────────────────────── */}
      {isFirstAccess && (
        <div className="rounded-[var(--radius-lg)] border border-blue-200 bg-[var(--blue-light)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Rocket size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Primeros pasos
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded border border-green-300 bg-green-100">
                <CheckSquare size={12} strokeWidth={1.5} className="text-[var(--green)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)] line-through">
                Crear tu workspace
              </span>
            </div>
            <Link href="/clients" className="flex items-center gap-3 group">
              <div className="flex h-5 w-5 items-center justify-center rounded border border-[var(--border-base)] bg-white" />
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--blue)] transition-colors">
                Agregar tu primer cliente
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--blue)] transition-colors" />
            </Link>
            <Link href="/projects" className="flex items-center gap-3 group">
              <div className="flex h-5 w-5 items-center justify-center rounded border border-[var(--border-base)] bg-white" />
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--blue)] transition-colors">
                Crear tu primer proyecto
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--blue)] transition-colors" />
            </Link>
            <Link href="/settings" className="flex items-center gap-3 group">
              <div className="flex h-5 w-5 items-center justify-center rounded border border-[var(--border-base)] bg-white" />
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--blue)] transition-colors">
                Invitar a tu equipo
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--blue)] transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Agent Greeting ──────────────────────────────────────────── */}
      {!loading && stats && <DashboardAgent stats={stats} />}

      {/* ── Row 1: Metric Cards ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="metric-card space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-slate-100 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-8 w-16 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            label="Clientes activos"
            value={stats.activeClients}
            footer={`de ${stats.totalClients} totales`}
            iconBg="bg-[var(--blue-light)]"
            iconColor="text-[var(--blue)]"
          />
          <MetricCard
            icon={FolderKanban}
            label="Proyectos activos"
            value={stats.activeProjects}
            footer="en progreso"
            iconBg="bg-[var(--purple-light)]"
            iconColor="text-[var(--purple)]"
          />
          <MetricCard
            icon={CheckSquare}
            label="Tareas completadas"
            value={stats.tasksCompletedThisWeek}
            footer="esta semana"
            iconBg="bg-[var(--green-light)]"
            iconColor="text-[var(--green)]"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Tareas vencidas"
            value={stats.tasksOverdue}
            footer={stats.tasksOverdue > 0 ? 'requieren atencion' : 'todo al dia'}
            footerColor={stats.tasksOverdue > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}
            iconBg="bg-[var(--red-light)]"
            iconColor="text-[var(--red)]"
          />
        </div>
      ) : null}

      {/* ── Row 2: Activity + Upcoming Tasks ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Activity summary — 65% */}
        <div className="lg:col-span-3 rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
              Actividad del mes
            </h2>
          </div>
          {loading ? (
            <div className="h-48 bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <div className="h-48 flex items-center justify-center rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-base)]">
              <div className="text-center">
                <BarChart2 size={32} strokeWidth={1} className="text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">Grafico de actividad</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {stats ? `${stats.tasksCompletedThisWeek} tareas completadas esta semana` : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming tasks — 35% */}
        <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Clock size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
              Tareas proximas
            </h2>
            <Link
              href="/tasks"
              className="text-xs text-[var(--blue)] hover:text-[#1d4ed8] font-medium transition-colors"
            >
              Ver todas
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="h-3 w-3 rounded bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/3 rounded bg-slate-100 animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100 animate-pulse" />
                  </div>
                  <div className="h-5 w-12 rounded-full bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats && stats.pendingTasks.length > 0 ? (
            <div className="space-y-1">
              {stats.pendingTasks.slice(0, 5).map((task) => {
                const badge = getDaysRemainingBadge(task.deadline)
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--blue)] transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.client && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {task.client.name}
                          </span>
                        )}
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          priorityColor[task.priority] || priorityColor.medium
                        )}>
                          {priorityLabel[task.priority] || task.priority}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ml-3',
                      badge.color
                    )}>
                      {badge.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckSquare size={24} strokeWidth={1.5} className="text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                No hay tareas pendientes con fecha limite
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Recent Clients + Active Projects ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent clients */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Users size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
              Clientes recientes
            </h2>
            <Link
              href="/clients"
              className="text-xs text-[var(--blue)] hover:text-[#1d4ed8] font-medium transition-colors"
            >
              Ver todos
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3.5 w-2/3 rounded bg-slate-100 animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats && stats.recentClients.length > 0 ? (
            <div className="space-y-2">
              {stats.recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white',
                      getAvatarColor(client.name)
                    )}
                  >
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    client.status === 'active' ? 'bg-[var(--green-light)] text-[var(--green)]' : 'bg-slate-100 text-slate-500'
                  )}>
                    {client.status === 'active' ? 'Activo' : client.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={24} strokeWidth={1.5} className="text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">Sin clientes aun</p>
              <Link
                href="/clients"
                className="mt-2 text-xs text-[var(--blue)] hover:text-[#1d4ed8] font-medium"
              >
                Agregar cliente
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
              Accesos rapidos
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              href="/clients"
              icon={Users}
              label="Clientes"
              description="Gestionar CRM"
              iconBg="bg-[var(--blue-light)]"
              iconColor="text-[var(--blue)]"
            />
            <QuickActionCard
              href="/projects"
              icon={FolderKanban}
              label="Proyectos"
              description="Ver proyectos"
              iconBg="bg-[var(--purple-light)]"
              iconColor="text-[var(--purple)]"
            />
            <QuickActionCard
              href="/tasks"
              icon={CheckSquare}
              label="Tareas"
              description="Gestionar tareas"
              iconBg="bg-[var(--green-light)]"
              iconColor="text-[var(--green)]"
            />
            <QuickActionCard
              href="/reports"
              icon={BarChart2}
              label="Reportes"
              description="Ver reportes"
              iconBg="bg-[var(--yellow-light)]"
              iconColor="text-[var(--yellow)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  footer,
  iconBg,
  iconColor,
  footerColor,
}: {
  icon: React.ElementType
  label: string
  value: number
  footer: string
  iconBg: string
  iconColor: string
  footerColor?: string
}) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className={cn('metric-icon', iconBg)}>
          <Icon size={16} strokeWidth={1.5} className={iconColor} />
        </div>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        <span className={cn('metric-period', footerColor)}>{footer}</span>
      </div>
    </div>
  )
}

// ── Quick Action Card ────────────────────────────────────────────────────────

function QuickActionCard({
  href,
  icon: Icon,
  label,
  description,
  iconBg,
  iconColor,
}: {
  href: string
  icon: React.ElementType
  label: string
  description: string
  iconBg: string
  iconColor: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white p-3.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all group"
    >
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]', iconBg)}>
        <Icon size={16} strokeWidth={1.5} className={iconColor} />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--blue)] transition-colors">
          {label}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </Link>
  )
}
