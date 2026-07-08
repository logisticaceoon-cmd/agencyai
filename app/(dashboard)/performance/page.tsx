'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  RefreshCw,
  FileText,
  AlertCircle,
  Timer,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BitacoraEntry {
  id: string
  title: string
  project_name: string | null
  completed_at: string
  created_at: string
  due_date: string | null
  was_on_time: boolean
  delay_hours: number | null
}

interface PerfSummary {
  completed: number
  pending: number
  in_progress: number
  on_time_rate: number
  avg_completion_hours: number
  prev_month_completed: number
  trend: number
}

interface Alert {
  id: string
  title: string
  due_date: string
  assignee_id: string | null
  priority: string
  delay_hours: number
  delay_days: number
  severity: string
}

interface Member {
  userId: string
  user: { id: string; fullName: string; email: string; avatarUrl?: string | null }
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
  const isCEO = user?.role === 'CEO' || user?.role === 'Manager' || user?.role === 'admin' || user?.role === 'owner'

  const [members, setMembers] = useState<Member[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [summary, setSummary] = useState<PerfSummary | null>(null)
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)

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
        // If not admin, only show self
        if (!isCEO && user?.id) {
          setSelectedUserId(user.id)
        }
        // Admin defaults to 'all' (already set as initial state)
      }
    } catch {}
  }, [isCEO, user?.id])

  // Load performance data
  const loadPerformanceData = useCallback(async (silent = false) => {
    if (!selectedUserId) return
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({
        user_id: selectedUserId,
        month: String(filterMonth),
        year: String(filterYear),
      })
      if (isCEO) params.set('debug', '1')

      const res = await fetch(`/api/performance?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setBitacora(data.bitacora || [])
        if (data.debug) setDebugData(data.debug)
      }

      setLastRefresh(new Date())
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedUserId, filterMonth, filterYear])

  // Load alerts
  const loadAlerts = useCallback(async (silent = false) => {
    if (!silent) setAlertsLoading(true)
    try {
      const res = await fetch('/api/performance/alerts')
      if (res.ok) {
        const data = await res.json()
        const memberAlerts = selectedUserId && selectedUserId !== 'all'
          ? (data.data || []).filter((a: Alert) => a.assignee_id === selectedUserId)
          : data.data || []
        setAlerts(memberAlerts)
      }
    } finally {
      if (!silent) setAlertsLoading(false)
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

  // Supabase real-time: listen for task completions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('performance-tasks')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `status=eq.completed`,
        },
        () => {
          // A task was just completed — refresh data silently
          loadPerformanceData(true)
          loadAlerts(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadPerformanceData, loadAlerts])

  // Refresh counter (update "Actualizado hace Xs" label every 10s)
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(() => setRefreshCounter(c => c + 1), 10_000)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [])

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

  const selectedMember = selectedUserId === 'all'
    ? { userId: 'all', user: { id: 'all', fullName: 'Todo el equipo', email: '' } } as Member
    : members.find(m => m.userId === selectedUserId) || null
  const visibleMembers = isCEO ? members : members.filter(m => m.userId === user?.id)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  const refreshLabel = (() => {
    void refreshCounter // trigger re-render
    const diff = Math.round((new Date().getTime() - lastRefresh.getTime()) / 1000)
    if (diff < 60) return `Actualizado hace ${diff}s`
    return `Actualizado hace ${Math.round(diff / 60)}min`
  })()

  // Format average completion time
  const formatAvgTime = (hours: number) => {
    if (hours === 0) return '—'
    if (hours < 24) return `${hours}h`
    const days = Math.round(hours / 24)
    return `${days}d`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Rendimiento del Equipo</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Tareas completadas por persona, tendencias y alertas de retraso
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{refreshLabel}</span>
          </button>
        </div>
      </div>

      {/* Member Tabs */}
      {visibleMembers.length === 0 && !isCEO ? (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-8 text-center">
          <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Sin miembros del equipo</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Agrega miembros en Configuracion &rarr; Equipo para ver su rendimiento.
          </p>
        </div>
      ) : (
        <>
          {/* Member tabs */}
          {(isCEO || visibleMembers.length > 1) && (
            <div className="flex items-center gap-2 flex-wrap">
              {isCEO && (
                <button
                  onClick={() => setSelectedUserId('all')}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-4 py-2.5 border text-sm font-medium transition-all',
                    selectedUserId === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-[var(--text-secondary)] border-[var(--border-base)] hover:border-blue-300 hover:text-blue-600'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold',
                    selectedUserId === 'all' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                  )}>
                    <User className="h-3.5 w-3.5" />
                  </div>
                  Todos
                </button>
              )}
              {visibleMembers.map((m) => {
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
          )}

          {selectedMember && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Completed this month */}
                <div className="rounded-xl border border-[var(--border-base)] bg-white p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="rounded-lg p-2 bg-green-50">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    {summary && summary.trend !== 0 && (
                      <div className={cn(
                        'flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5',
                        summary.trend > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                      )}>
                        {summary.trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(summary.trend)}
                      </div>
                    )}
                    {summary && summary.trend === 0 && (
                      <div className="flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5 text-slate-400 bg-slate-50">
                        <Minus className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-green-600">{summary?.completed ?? 0}</p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Tareas completadas</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {MONTHS_ES[filterMonth]} {filterYear}
                    {summary ? ` · ${summary.prev_month_completed} mes anterior` : ''}
                  </p>
                </div>

                {/* Pending (current — not filtered by month) */}
                <div className="rounded-xl border border-[var(--border-base)] bg-white p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="rounded-lg p-2 bg-blue-50">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {(summary?.pending ?? 0) + (summary?.in_progress ?? 0)}
                  </p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Pendientes actual</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {summary?.pending ?? 0} por hacer · {summary?.in_progress ?? 0} en progreso
                  </p>
                </div>

                {/* On-time rate */}
                <div className={cn(
                  'rounded-xl border bg-white p-4',
                  summary && summary.on_time_rate >= 80 ? 'border-[var(--border-base)] ring-1 ring-indigo-100' : 'border-[var(--border-base)]'
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="rounded-lg p-2 bg-indigo-50">
                      <Target className="h-5 w-5 text-indigo-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">{summary?.on_time_rate ?? 100}%</p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">A tiempo</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Completadas dentro del plazo</p>
                </div>

                {/* Avg completion time */}
                <div className="rounded-xl border border-[var(--border-base)] bg-white p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="rounded-lg p-2 bg-purple-50">
                      <Timer className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatAvgTime(summary?.avg_completion_hours ?? 0)}</p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Tiempo promedio</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Creacion &rarr; completada</p>
                </div>

                {/* Active alerts */}
                <div className={cn(
                  'rounded-xl border bg-white p-4 transition-all',
                  alerts.length > 0 ? 'border-orange-200 shadow-sm' : 'border-[var(--border-base)]'
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('rounded-lg p-2', alerts.length > 0 ? 'bg-orange-50' : 'bg-slate-50')}>
                      <AlertTriangle className={cn('h-5 w-5', alerts.length > 0 ? 'text-orange-500' : 'text-slate-400')} />
                    </div>
                    {alerts.length > 0 && (
                      <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                    )}
                  </div>
                  <p className={cn('text-2xl font-bold', alerts.length > 0 ? 'text-orange-600' : 'text-slate-500')}>
                    {alerts.length}
                  </p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Alertas activas</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Tareas con +48h retraso</p>
                </div>
              </div>

              {/* Trend banner */}
              {summary && summary.completed > 0 && (
                <div className={cn(
                  'rounded-xl p-4 flex items-center gap-3',
                  summary.trend > 0
                    ? 'bg-green-50 border border-green-200'
                    : summary.trend < 0
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-slate-50 border border-slate-200'
                )}>
                  {summary.trend > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : summary.trend < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <Minus className="h-5 w-5 text-slate-500 flex-shrink-0" />
                  )}
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{summary.completed}</span> tareas completadas en {MONTHS_ES[filterMonth]} vs{' '}
                    <span className="font-semibold">{summary.prev_month_completed}</span> el mes anterior
                    {summary.trend > 0 && (
                      <span className="text-green-700 font-medium"> (+{summary.trend} mas)</span>
                    )}
                    {summary.trend < 0 && (
                      <span className="text-red-700 font-medium"> ({summary.trend} menos)</span>
                    )}
                    {' · '}Tasa a tiempo: <span className="font-semibold">{summary.on_time_rate}%</span>
                    {' · '}Promedio: <span className="font-semibold">{formatAvgTime(summary.avg_completion_hours)}</span>
                  </p>
                </div>
              )}

              {/* Main content: bitacora + alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bitacora */}
                <div className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-base)]">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        Bitacora — {(selectedMember.user?.fullName || selectedMember.user?.email || 'Miembro').split(' ')[0]}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {MONTHS_ES[filterMonth]} {filterYear} · Actualiza en tiempo real
                      </p>
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
                      {reportSuccess ? 'Reporte generado' : generatingReport ? 'Generando...' : 'Generar reporte'}
                    </button>
                  </div>

                  <div className="divide-y divide-[var(--border-base)] max-h-[500px] overflow-y-auto">
                    {loading ? (
                      <div className="p-6 space-y-3">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : bitacora.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <CheckCircle2 className="h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Sin tareas completadas</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Cuando {(selectedMember.user?.fullName || 'el miembro').split(' ')[0]} complete tareas, apareceran aqui automaticamente.
                        </p>
                      </div>
                    ) : (
                      bitacora.map((entry) => (
                        <BitacoraRow key={entry.id} entry={entry} />
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

                  <div className="divide-y divide-[var(--border-base)] max-h-[500px] overflow-y-auto">
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
                          {(selectedMember.user?.fullName || 'Miembro').split(' ')[0]} esta al dia con sus tareas.
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
                    <p className="text-sm font-medium text-blue-800">Manuales y SOPs del equipo</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Los SOPs y manuales estan disponibles en{' '}
                      <a href="/docs" className="underline font-medium">Documentos &rarr; SOPs</a>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Debug panel — admin only */}
              {isCEO && debugData && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Panel de Diagnostico (Admin)
                    </span>
                    <span className="text-xs text-slate-400">{showDebug ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                  {showDebug && (
                    <div className="px-5 pb-4 border-t border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Total tareas en DB</p>
                          <p className="text-lg font-bold text-slate-900">{(debugData.total_tasks_all as number) ?? '?'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Activas (no eliminadas)</p>
                          <p className="text-lg font-bold text-green-600">{(debugData.total_tasks_active as number) ?? '?'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Eliminadas (soft delete)</p>
                          <p className="text-lg font-bold text-red-600">{(debugData.total_tasks_deleted as number) ?? '?'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Con completed_at</p>
                          <p className="text-lg font-bold text-blue-600">{(debugData.tasks_with_completed_at as number) ?? '?'}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        <p><span className="font-medium">Status:</span> {JSON.stringify(debugData.status_counts)}</p>
                        <p><span className="font-medium">completed_at rango:</span> {(debugData.completed_at_min as string) || 'ninguno'} — {(debugData.completed_at_max as string) || 'ninguno'}</p>
                        <p><span className="font-medium">Filtros aplicados:</span> {JSON.stringify((debugData.query_filters as Record<string, string>))}</p>
                        <p><span className="font-medium">Muestra assignee:</span></p>
                        <pre className="bg-slate-100 rounded p-2 overflow-x-auto text-[10px]">
                          {JSON.stringify(debugData.assignee_sample, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function BitacoraRow({ entry }: { entry: BitacoraEntry }) {
  const completedDate = new Date(entry.completed_at)
  const dateStr = completedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  const timeStr = completedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  // Calc completion time
  const createdDate = new Date(entry.created_at)
  const completionHours = Math.round((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60))
  const completionLabel = completionHours < 24
    ? `${completionHours}h`
    : `${Math.round(completionHours / 24)}d`

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors">
      <div className={cn(
        'flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center',
        entry.was_on_time ? 'bg-green-50' : 'bg-orange-50'
      )}>
        {entry.was_on_time
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : <AlertTriangle className="h-4 w-4 text-orange-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-[var(--text-muted)]">{dateStr} {timeStr}</span>
          {entry.project_name && (
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{entry.project_name}</span>
          )}
          <span className="text-xs text-[var(--text-muted)]">{completionLabel}</span>
          {!entry.was_on_time && entry.delay_hours && (
            <span className="text-xs text-orange-600 font-medium">
              +{entry.delay_hours}h retraso
            </span>
          )}
        </div>
      </div>
      <span className={cn(
        'flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
        entry.was_on_time ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
      )}>
        {entry.was_on_time ? 'A tiempo' : 'Retrasado'}
      </span>
    </div>
  )
}

function AlertEntry({ alert }: { alert: Alert }) {
  const dueDate = new Date(alert.due_date)
  const dueDateStr = dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

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
          <span className="text-xs text-[var(--text-muted)]">Vencio: {dueDateStr}</span>
          <span className="text-xs text-red-600 font-medium">+{alert.delay_days}d retraso</span>
        </div>
      </div>
      <span className={cn('flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', SEVERITY_BADGE[alert.severity])}>
        {SEVERITY_LABEL[alert.severity] || alert.severity}
      </span>
    </div>
  )
}
