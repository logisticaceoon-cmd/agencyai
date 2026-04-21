'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  RefreshCw,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PerfLog {
  id: string
  user_id: string
  task_id: string | null
  client_id: string | null
  action_type: string
  title: string
  description: string | null
  hours_spent: number | null
  delay_hours: number | null
  was_on_time: boolean
  month: number
  year: number
  created_at: string
}

interface Alert {
  id: string
  title: string
  deadline: string
  assignedTo: string[]
  priority: string
  delay_hours: number
  delay_days: number
  severity: 'critical' | 'high' | 'medium'
}

interface Member {
  userId: string
  user: { id: string; fullName: string; email: string; avatarUrl?: string | null }
}

interface PerfSummary {
  total: number
  completed: number
  pending: number
  in_progress: number
  overdue: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border border-red-200',
  high: 'bg-orange-50 text-orange-700 border border-orange-200',
  medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
}

const MONTHS_ES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { user } = useCurrentUser()
  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  const [members, setMembers] = useState<Member[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [logs, setLogs] = useState<PerfLog[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<PerfSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)

  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())

  // Load team members
  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members')
      if (res.ok) {
        const data = await res.json()
        const memberList: Member[] = data.data || []
        setMembers(memberList)
        if (memberList.length > 0 && !selectedUserId) {
          setSelectedUserId(memberList[0].userId)
        }
      }
    } catch {}
  }, [selectedUserId])

  // Load performance data for selected member
  const loadPerformanceData = useCallback(async () => {
    if (!selectedUserId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        user_id: selectedUserId,
        month: String(filterMonth),
        year: String(filterYear),
      })

      const [perfRes, logsRes] = await Promise.all([
        fetch(`/api/performance?${params}`),
        fetch(`/api/performance/logs?${params}`),
      ])

      if (perfRes.ok) {
        const data = await perfRes.json()
        setSummary(data.summary)
      }

      if (logsRes.ok) {
        const data = await logsRes.json()
        setLogs(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [selectedUserId, filterMonth, filterYear])

  // Load alerts (all members, not filtered by month)
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true)
    try {
      const res = await fetch('/api/performance/alerts')
      if (res.ok) {
        const data = await res.json()
        // Filter alerts for selected user
        const memberAlerts = selectedUserId
          ? (data.data || []).filter((a: Alert) => a.assignedTo?.includes(selectedUserId))
          : data.data || []
        setAlerts(memberAlerts)
      }
    } finally {
      setAlertsLoading(false)
    }
  }, [selectedUserId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (selectedUserId) {
      loadPerformanceData()
      loadAlerts()
    }
  }, [selectedUserId, filterMonth, filterYear, loadPerformanceData, loadAlerts])

  async function handleGenerateReport() {
    if (!selectedUserId || generatingReport) return
    setGeneratingReport(true)
    setReportSuccess(false)
    try {
      const res = await fetch('/api/performance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          report_type: 'monthly',
          month: filterMonth,
          year: filterYear,
        }),
      })
      if (res.ok) {
        setReportSuccess(true)
        setTimeout(() => setReportSuccess(false), 3000)
      }
    } finally {
      setGeneratingReport(false)
    }
  }

  const selectedMember = members.find(m => m.userId === selectedUserId)
  const onTimeCount = logs.filter(l => l.was_on_time).length
  const onTimeRate = logs.length > 0 ? Math.round((onTimeCount / logs.length) * 100) : 0

  // Years for filter
  const years = [2025, 2026, 2027]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Rendimiento del Equipo</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Bitácora de actividad, alertas de retraso y resumen mensual por persona
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month/Year filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-secondary)] focus:border-blue-500 focus:outline-none"
          >
            {MONTHS_ES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-secondary)] focus:border-blue-500 focus:outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => { loadPerformanceData(); loadAlerts() }}
            className="rounded-lg border border-[var(--border-base)] bg-white p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Member Tabs */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-8 text-center">
          <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Sin miembros del equipo</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Agrega miembros en Configuracion → Equipo para ver su rendimiento.
          </p>
        </div>
      ) : (
        <>
          {/* Member tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {members.map((m) => {
              const isActive = m.userId === selectedUserId
              const name = m.user?.fullName || m.user?.email || 'NN'
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <button
                  key={m.userId}
                  onClick={() => setSelectedUserId(m.userId)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-4 py-2.5 border text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-[var(--text-secondary)] border-[var(--border-base)] hover:border-blue-300 hover:text-blue-600'
                  )}
                >
                  {m.user?.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={name} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className={cn(
                      'flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                    )}>
                      {initials}
                    </div>
                  )}
                  {name.split(' ')[0]}
                </button>
              )
            })}
          </div>

          {selectedMember && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Tareas completadas"
                  value={summary?.completed ?? logs.length}
                  icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                  color="text-green-600"
                  bg="bg-green-50"
                  period={`${MONTHS_ES[filterMonth]} ${filterYear}`}
                />
                <StatCard
                  label="Pendientes"
                  value={summary?.pending ?? 0}
                  icon={<Clock className="h-5 w-5 text-blue-500" />}
                  color="text-blue-600"
                  bg="bg-blue-50"
                />
                <StatCard
                  label="A tiempo"
                  value={`${onTimeRate}%`}
                  icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}
                  color="text-indigo-600"
                  bg="bg-indigo-50"
                  highlight={onTimeRate >= 80}
                />
                <StatCard
                  label="Alertas activas"
                  value={alerts.length}
                  icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
                  color={alerts.length > 0 ? 'text-orange-600' : 'text-slate-500'}
                  bg={alerts.length > 0 ? 'bg-orange-50' : 'bg-slate-50'}
                  urgent={alerts.length > 0}
                />
              </div>

              {/* Main content: bitácora + alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bitácora */}
                <div className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-base)]">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        Bitácora — {(selectedMember.user?.fullName || selectedMember.user?.email || 'Miembro').split(' ')[0]}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{MONTHS_ES[filterMonth]} {filterYear}</p>
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        reportSuccess
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-[var(--blue-light)] text-[var(--blue)] hover:bg-blue-100'
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {reportSuccess ? 'Reporte generado ✓' : generatingReport ? 'Generando...' : 'Generar reporte'}
                    </button>
                  </div>

                  <div className="divide-y divide-[var(--border-base)] max-h-[420px] overflow-y-auto">
                    {loading ? (
                      <div className="p-6 space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <CheckCircle2 className="h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Sin actividad registrada</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Las tareas completadas apareceran aqui automaticamente.
                        </p>
                      </div>
                    ) : (
                      logs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                      ))
                    )}
                  </div>
                </div>

                {/* Alertas */}
                <div className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-base)]">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        Alertas de Retraso
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Tareas con +48h de retraso</p>
                    </div>
                    {alerts.length > 0 && (
                      <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-orange-100 text-orange-600 text-xs font-semibold px-1.5">
                        {alerts.length}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-[var(--border-base)] max-h-[420px] overflow-y-auto">
                    {alertsLoading ? (
                      <div className="p-6 space-y-3">
                        {[1,2].map(i => (
                          <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : alerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <CheckCircle2 className="h-10 w-10 text-green-200 mb-3" />
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Sin alertas activas</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {(selectedMember.user?.fullName || selectedMember.user?.email || 'Miembro').split(' ')[0]} esta al dia con sus tareas.
                        </p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <AlertEntry key={alert.id} alert={alert} />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* SOPs reminder */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Manuals y SOPs del equipo</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Los SOPs y manuales del equipo estan disponibles en{' '}
                      <a href="/docs" className="underline font-medium">Documentos → SOPs</a>.
                      Asegurate de que {(selectedMember.user?.fullName || selectedMember.user?.email || 'Miembro').split(' ')[0]} los tenga actualizados.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
  period,
  highlight,
  urgent,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  bg: string
  period?: string
  highlight?: boolean
  urgent?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-white p-4 transition-all',
      urgent ? 'border-orange-200 shadow-sm' : 'border-[var(--border-base)]',
      highlight && 'ring-1 ring-indigo-100'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('rounded-lg p-2', bg)}>
          {icon}
        </div>
        {urgent && urgent === true && (
          <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
        )}
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">{label}</p>
      {period && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{period}</p>}
    </div>
  )
}

function LogEntry({ log }: { log: PerfLog }) {
  const date = new Date(log.created_at)
  const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors">
      <div className={cn(
        'flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center',
        log.was_on_time ? 'bg-green-50' : 'bg-orange-50'
      )}>
        {log.was_on_time ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{log.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--text-muted)]">{dateStr} {timeStr}</span>
          {!log.was_on_time && log.delay_hours && (
            <span className="text-xs text-orange-600 font-medium">
              +{log.delay_hours}h de retraso
            </span>
          )}
          {log.hours_spent && (
            <span className="text-xs text-[var(--text-muted)]">{log.hours_spent}h</span>
          )}
        </div>
      </div>
      <span className={cn(
        'flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
        log.was_on_time ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
      )}>
        {log.was_on_time ? 'A tiempo' : 'Retrasado'}
      </span>
    </div>
  )
}

function AlertEntry({ alert }: { alert: Alert }) {
  const deadline = new Date(alert.deadline)
  const deadlineStr = deadline.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors">
      <div className={cn(
        'flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center',
        alert.severity === 'critical' ? 'bg-red-50' : alert.severity === 'high' ? 'bg-orange-50' : 'bg-yellow-50'
      )}>
        <AlertTriangle className={cn(
          'h-4 w-4',
          alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{alert.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">Vencio: {deadlineStr}</span>
          <span className="text-xs text-red-600 font-medium">+{alert.delay_days}d retraso</span>
        </div>
      </div>
      <span className={cn('flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', SEVERITY_BADGE[alert.severity])}>
        {alert.severity === 'critical' ? SEVERITY_LABEL.critical : alert.severity === 'high' ? SEVERITY_LABEL.high : SEVERITY_LABEL.medium}
      </span>
    </div>
  )
}
