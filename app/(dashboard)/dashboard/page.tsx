'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn, formatDate } from '@/lib/utils'
import {
  Users,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  BarChart2,
  Rocket,
  UserPlus,
  Settings,
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
    hour: '2-digit',
    minute: '2-digit',
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
      className: 'bg-red-50 text-red-700 border-red-200',
    }
  }
  if (days === 0) {
    return {
      label: 'Hoy',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }
  if (days <= 2) {
    return {
      label: `${days}d`,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }
  return {
    label: `${days}d`,
    className: 'bg-green-50 text-green-700 border-green-200',
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
    'bg-green-500',
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
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-green-50 text-green-700 border-green-200',
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
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500 capitalize">
          {dateString}
        </p>
      </div>

      {/* ── First-access checklist ─────────────────────────────────────── */}
      {isFirstAccess && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Primeros pasos
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded border border-green-300 bg-green-100">
                <CheckSquare className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500 line-through">
                Crear tu workspace
              </span>
            </div>
            <Link
              href="/clients"
              className="flex items-center gap-3 group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white" />
              <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">
                Agregar tu primer cliente
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-3 group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white" />
              <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">
                Crear tu primer proyecto
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white" />
              <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">
                Invitar a tu equipo
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="h-7 w-16 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Clientes activos"
            value={stats.activeClients}
            subtitle={`de ${stats.totalClients} totales`}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <KpiCard
            icon={FolderKanban}
            label="Proyectos activos"
            value={stats.activeProjects}
            subtitle="en progreso"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
          <KpiCard
            icon={CheckSquare}
            label="Tareas completadas"
            value={stats.tasksCompletedThisWeek}
            subtitle="esta semana"
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Tareas vencidas"
            value={stats.tasksOverdue}
            subtitle={stats.tasksOverdue > 0 ? 'requieren atencion' : 'todo al dia'}
            subtitleColor={stats.tasksOverdue > 0 ? 'text-red-500' : 'text-green-600'}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        </div>
      ) : null}

      {/* ── Main content grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pending tasks */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Tareas proximas
            </h2>
            <Link
              href="/tasks"
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Ver todas
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-slate-200 animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats && stats.pendingTasks.length > 0 ? (
            <div className="space-y-1">
              {stats.pendingTasks.map((task) => {
                const badge = getDaysRemainingBadge(task.deadline)
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.client && (
                          <span className="text-xs text-slate-400">
                            {task.client.name}
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            priorityColor[task.priority] || priorityColor.medium
                          )}
                        >
                          {priorityLabel[task.priority] || task.priority}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ml-3',
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckSquare className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                No hay tareas pendientes con fecha limite
              </p>
            </div>
          )}
        </div>

        {/* Recent clients */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Clientes recientes
            </h2>
            <Link
              href="/clients"
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Ver todos
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats && stats.recentClients.length > 0 ? (
            <div className="space-y-3">
              {stats.recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors"
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
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Sin clientes aun</p>
              <Link
                href="/clients"
                className="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                Agregar cliente
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Accesos rapidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionCard
            href="/clients"
            icon={Users}
            label="Clientes"
            description="Gestionar CRM"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <QuickActionCard
            href="/projects"
            icon={FolderKanban}
            label="Proyectos"
            description="Ver proyectos"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
          <QuickActionCard
            href="/tasks"
            icon={CheckSquare}
            label="Tareas"
            description="Gestionar tareas"
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <QuickActionCard
            href="/reports"
            icon={BarChart2}
            label="Reportes"
            description="Ver reportes"
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBg,
  iconColor,
  subtitleColor,
}: {
  icon: React.ElementType
  label: string
  value: number
  subtitle: string
  iconBg: string
  iconColor: string
  subtitleColor?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className={cn('text-xs mt-0.5', subtitleColor ?? 'text-slate-400')}>
        {subtitle}
      </p>
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
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all group"
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg)}>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
          {label}
        </p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </Link>
  )
}
