'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from '@/hooks/use-toast'
import {
  Clock,
  Play,
  Square,
  Plus,
  Download,
  Trash2,
  Edit3,
  DollarSign,
  Timer,
  TrendingUp,
  BarChart2,
  X,
  Check,
} from 'lucide-react'
import { downloadPDF } from '@/lib/pdf'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TimeEntry {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  client_id: string | null
  description: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  billable: boolean
  hourly_rate: number | null
  status: 'running' | 'stopped'
  created_at: string
  clients: { id: string; name: string } | null
  projects: { id: string; name: string } | null
}

interface Summary {
  totalMinutes: number
  totalHours: number
  billableMinutes: number
  billableHours: number
  nonBillableMinutes: number
  byClient: { name: string; minutes: number }[]
  byProject: { name: string; minutes: number }[]
  entryCount: number
}

interface ClientOption { id: string; name: string }
interface ProjectOption { id: string; name: string }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getStartOfWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

function getStartOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getStartOfDay(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const PIE_COLORS = ['#3b82f6', '#94a3b8']
const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444']

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TimePage() {
  const { user } = useCurrentUser()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])

  // Running timer state
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterProject, setFilterProject] = useState('')

  // Manual entry form
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    client_id: '',
    project_id: '',
    start_time: '',
    end_time: '',
    billable: true,
    hourly_rate: '',
  })

  // Edit modal
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)

  // Timer description for quick start
  const [timerDesc, setTimerDesc] = useState('')
  const [timerClient, setTimerClient] = useState('')
  const [timerProject, setTimerProject] = useState('')

  // ─── Date range calculation ──────────────────────────────────────────────────

  const getDateParams = useCallback(() => {
    if (dateRange === 'today') return { from: getStartOfDay(), to: new Date().toISOString() }
    if (dateRange === 'week') return { from: getStartOfWeek(), to: new Date().toISOString() }
    if (dateRange === 'month') return { from: getStartOfMonth(), to: new Date().toISOString() }
    if (dateRange === 'custom' && customFrom) {
      return { from: new Date(customFrom).toISOString(), to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : new Date().toISOString() }
    }
    return { from: getStartOfWeek(), to: new Date().toISOString() }
  }, [dateRange, customFrom, customTo])

  // ─── Fetch data ──────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    try {
      const { from, to } = getDateParams()
      const params = new URLSearchParams({ from, to, limit: '100' })
      if (filterClient) params.set('client_id', filterClient)
      if (filterProject) params.set('project_id', filterProject)

      const res = await fetch(`/api/time-entries?${params}`)
      const json = await res.json()
      if (res.ok) {
        setEntries(json.data || [])
        const running = (json.data || []).find((e: TimeEntry) => e.status === 'running')
        if (running) {
          setRunningEntry(running)
          const elapsedSec = Math.round((Date.now() - new Date(running.start_time).getTime()) / 1000)
          setElapsed(elapsedSec)
        }
      }
    } catch { /* silently fail */ }
  }, [getDateParams, filterClient, filterProject])

  const fetchSummary = useCallback(async () => {
    try {
      const { from, to } = getDateParams()
      const params = new URLSearchParams({ from, to })
      const res = await fetch(`/api/time-entries/summary?${params}`)
      const json = await res.json()
      if (res.ok) setSummary(json)
    } catch { /* silently fail */ }
  }, [getDateParams])

  const fetchOptions = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/clients?limit=200'),
        fetch('/api/projects?limit=200'),
      ])
      const cJson = await cRes.json()
      const pJson = await pRes.json()
      setClients(cJson.data || cJson.clients || [])
      setProjects(pJson.data || pJson.projects || [])
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEntries(), fetchSummary(), fetchOptions()]).finally(() => setLoading(false))
  }, [fetchEntries, fetchSummary, fetchOptions])

  // ─── Timer interval ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (runningEntry) {
      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - new Date(runningEntry.start_time).getTime()) / 1000)
        setElapsed(sec)
      }, 1000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [runningEntry])

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function startTimer() {
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: timerDesc || 'Sin descripcion',
          client_id: timerClient || null,
          project_id: timerProject || null,
          status: 'running',
          billable: true,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setRunningEntry(json.data)
        setTimerDesc('')
        toast({ title: 'Timer iniciado' })
        fetchEntries()
        fetchSummary()
      }
    } catch {
      toast({ title: 'Error al iniciar timer', variant: 'destructive' })
    }
  }

  async function stopTimer() {
    if (!runningEntry) return
    try {
      const res = await fetch(`/api/time-entries/${runningEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'stopped' }),
      })
      if (res.ok) {
        setRunningEntry(null)
        toast({ title: 'Timer detenido' })
        fetchEntries()
        fetchSummary()
      }
    } catch {
      toast({ title: 'Error al detener timer', variant: 'destructive' })
    }
  }

  async function addManualEntry() {
    if (!formData.start_time || !formData.end_time) {
      toast({ title: 'Selecciona inicio y fin', variant: 'destructive' })
      return
    }
    const start = new Date(formData.start_time)
    const end = new Date(formData.end_time)
    const duration = Math.round((end.getTime() - start.getTime()) / 60000)
    if (duration <= 0) {
      toast({ title: 'El fin debe ser despues del inicio', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description || 'Entrada manual',
          client_id: formData.client_id || null,
          project_id: formData.project_id || null,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          duration_minutes: duration,
          billable: formData.billable,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          status: 'stopped',
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormData({ description: '', client_id: '', project_id: '', start_time: '', end_time: '', billable: true, hourly_rate: '' })
        toast({ title: 'Entrada creada' })
        fetchEntries()
        fetchSummary()
      }
    } catch {
      toast({ title: 'Error al crear entrada', variant: 'destructive' })
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Eliminar esta entrada de tiempo?')) return
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Entrada eliminada' })
        fetchEntries()
        fetchSummary()
      }
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  async function updateEntry() {
    if (!editEntry) return
    try {
      const res = await fetch(`/api/time-entries/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editEntry.description,
          client_id: editEntry.client_id,
          project_id: editEntry.project_id,
          billable: editEntry.billable,
          hourly_rate: editEntry.hourly_rate,
        }),
      })
      if (res.ok) {
        setEditEntry(null)
        toast({ title: 'Entrada actualizada' })
        fetchEntries()
        fetchSummary()
      }
    } catch {
      toast({ title: 'Error al actualizar', variant: 'destructive' })
    }
  }

  // ─── CSV Export ──────────────────────────────────────────────────────────────

  function exportCSV() {
    const headers = ['Fecha', 'Descripcion', 'Cliente', 'Proyecto', 'Duracion (min)', 'Facturable', 'Tarifa/h']
    const rows = entries.filter(e => e.status === 'stopped').map(e => [
      new Date(e.start_time).toLocaleDateString('es-MX'),
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.clients?.name || 'Sin cliente',
      e.projects?.name || 'Sin proyecto',
      e.duration_minutes?.toString() || '0',
      e.billable ? 'Si' : 'No',
      e.hourly_rate?.toString() || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tiempo_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── PDF Export ──────────────────────────────────────────────────────────────

  function exportPDF() {
    const stoppedEntries = entries.filter(e => e.status === 'stopped')
    const columns = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'proyecto', label: 'Proyecto' },
      { key: 'duracion', label: 'Duracion' },
      { key: 'facturable', label: 'Facturable' },
      { key: 'tarifa', label: 'Tarifa' },
    ]
    const data = stoppedEntries.map(e => ({
      fecha: new Date(e.start_time).toLocaleDateString('es-MX'),
      descripcion: e.description || '-',
      cliente: e.clients?.name || 'Sin cliente',
      proyecto: e.projects?.name || 'Sin proyecto',
      duracion: e.duration_minutes ? formatDuration(e.duration_minutes) : '-',
      facturable: e.billable ? 'Si' : 'No',
      tarifa: e.hourly_rate ? `$${e.hourly_rate}` : '-',
    }))
    const rangeLabel = dateRange === 'today' ? 'Hoy' : dateRange === 'week' ? 'Esta semana' : dateRange === 'month' ? 'Este mes' : 'Rango personalizado'
    downloadPDF({
      title: 'Control de Tiempo',
      subtitle: `${rangeLabel} — ${stoppedEntries.length} entradas`,
      filename: `tiempo_${new Date().toISOString().split('T')[0]}`,
      columns,
      data,
      orientation: 'landscape',
    })
  }

  // ─── Chart data ──────────────────────────────────────────────────────────────

  const clientChartData = (summary?.byClient || []).slice(0, 8).map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
    horas: Math.round(c.minutes / 60 * 10) / 10,
  }))

  const pieData = summary ? [
    { name: 'Facturable', value: summary.billableMinutes },
    { name: 'No facturable', value: summary.nonBillableMinutes },
  ] : []

  // Calculate revenue estimate
  const avgRate = entries.filter(e => e.hourly_rate).reduce((sum, e) => sum + (e.hourly_rate || 0), 0) / Math.max(1, entries.filter(e => e.hourly_rate).length)
  const estimatedRevenue = summary ? Math.round(summary.billableHours * (avgRate || 0)) : 0

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Control de tiempo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registra y analiza las horas de trabajo</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Plus size={16} /> Manual
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={16} /> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {runningEntry ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700 truncate">{runningEntry.description}</span>
              {runningEntry.clients && (
                <span className="text-xs text-slate-400 flex-shrink-0">- {runningEntry.clients.name}</span>
              )}
            </div>
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">{formatElapsed(elapsed)}</span>
            <button onClick={stopTimer} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
              <Square size={14} /> Detener
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="En que estas trabajando?"
              value={timerDesc}
              onChange={e => setTimerDesc(e.target.value)}
              className="flex-1 text-sm border-0 bg-transparent focus:outline-none text-slate-700 placeholder:text-slate-400"
              onKeyDown={e => e.key === 'Enter' && startTimer()}
            />
            <select value={timerClient} onChange={e => setTimerClient(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white">
              <option value="">Cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={timerProject} onChange={e => setTimerProject(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white">
              <option value="">Proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={startTimer} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
              <Play size={14} /> Iniciar
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Clock} label={dateRange === 'today' ? 'Hoy' : dateRange === 'week' ? 'Esta semana' : 'Este mes'} value={summary ? `${summary.totalHours}h` : '0h'} sub={`${summary?.entryCount || 0} entradas`} color="blue" />
        <SummaryCard icon={Timer} label="Facturable" value={summary ? `${summary.billableHours}h` : '0h'} sub={summary && summary.totalMinutes > 0 ? `${Math.round(summary.billableMinutes / summary.totalMinutes * 100)}%` : '0%'} color="green" />
        <SummaryCard icon={TrendingUp} label="No facturable" value={summary ? `${Math.round(summary.nonBillableMinutes / 60 * 10) / 10}h` : '0h'} sub="Tiempo interno" color="slate" />
        <SummaryCard icon={DollarSign} label="Ingreso estimado" value={`$${estimatedRevenue.toLocaleString()}`} sub={avgRate ? `$${Math.round(avgRate)}/h promedio` : 'Sin tarifas'} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {([['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['custom', 'Rango']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600" />
            <span className="text-slate-400 text-sm">a</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600" />
          </>
        )}
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white">
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white">
          <option value="">Todos los proyectos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Charts */}
      {summary && summary.entryCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hours by Client */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <BarChart2 size={14} /> Horas por cliente
            </h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={clientChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}h`, 'Horas']} />
                  <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
                    {clientChartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Billable vs Non-billable */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <DollarSign size={14} /> Facturable vs No facturable
            </h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name || ''} ${((percent as number) * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${formatDuration(v as number)}`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Time Entries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Entradas de tiempo ({entries.filter(e => e.status === 'stopped').length})</h3>
        </div>
        {entries.filter(e => e.status === 'stopped').length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No hay entradas en este periodo</p>
            <p className="text-xs text-slate-400 mt-1">Inicia un timer o agrega una entrada manual</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Descripcion</th>
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Proyecto</th>
                  <th className="px-4 py-2.5 text-right">Duracion</th>
                  <th className="px-4 py-2.5 text-center">Facturable</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.filter(e => e.status === 'stopped').map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {new Date(entry.start_time).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-[250px] truncate">{entry.description || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{entry.clients?.name || <span className="text-slate-400">-</span>}</td>
                    <td className="px-4 py-2.5 text-slate-600">{entry.projects?.name || <span className="text-slate-400">-</span>}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{entry.duration_minutes ? formatDuration(entry.duration_minutes) : '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {entry.billable ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">SI</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">NO</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditEntry({ ...entry })} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => deleteEntry(entry.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Agregar entrada manual</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripcion</label>
              <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Que hiciste?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
                <select value={formData.client_id} onChange={e => setFormData({ ...formData, client_id: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Ninguno</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Proyecto</label>
                <select value={formData.project_id} onChange={e => setFormData({ ...formData, project_id: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Ninguno</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Inicio</label>
                <input type="datetime-local" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fin</label>
                <input type="datetime-local" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tarifa por hora</label>
                <input type="number" value={formData.hourly_rate} onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, billable: !formData.billable })}
                    className={`w-8 h-5 rounded-full transition-colors ${formData.billable ? 'bg-blue-500' : 'bg-slate-300'} relative`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.billable ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-600">Facturable</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={addManualEntry} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-1.5">
                <Check size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditEntry(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Editar entrada</h2>
              <button onClick={() => setEditEntry(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripcion</label>
              <input type="text" value={editEntry.description} onChange={e => setEditEntry({ ...editEntry, description: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
                <select value={editEntry.client_id || ''} onChange={e => setEditEntry({ ...editEntry, client_id: e.target.value || null })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Ninguno</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Proyecto</label>
                <select value={editEntry.project_id || ''} onChange={e => setEditEntry({ ...editEntry, project_id: e.target.value || null })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Ninguno</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tarifa por hora</label>
                <input type="number" value={editEntry.hourly_rate || ''} onChange={e => setEditEntry({ ...editEntry, hourly_rate: e.target.value ? parseFloat(e.target.value) : null })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setEditEntry({ ...editEntry, billable: !editEntry.billable })}
                    className={`w-8 h-5 rounded-full transition-colors ${editEntry.billable ? 'bg-blue-500' : 'bg-slate-300'} relative`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editEntry.billable ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-600">Facturable</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditEntry(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={updateEntry} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-1.5">
                <Check size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    slate: 'bg-slate-100 text-slate-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          <Icon size={14} />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}
