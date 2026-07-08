'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MarketResearchTab } from '@/components/market-research/MarketResearchTab'
import Link from 'next/link'
import { cn, getInitials } from '@/lib/utils'
import { BookmarkCard, type Bookmark } from '@/components/bookmarks/BookmarkCard'
import {
  ArrowLeft,
  Globe,
  Mail,
  TrendingUp,
  TrendingDown,
  Phone,
  DollarSign,
  Building2,
  Calendar,
  User,
  FileText,
  ClipboardList,
  Briefcase,
  Percent,
  BookOpen,
  Plus,
  MessageCircle,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Timer,
  Receipt,
  Activity,
  Image,
  X,
} from 'lucide-react'

// -- Helpers ------------------------------------------------------------------

function getColor(name: string) {
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

const statusLabel: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  onboarding: 'Onboarding',
  paused: 'Pausado',
  risk: 'En riesgo',
  scaling: 'Escalando',
}

const statusColor: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-slate-50 text-slate-500 border-slate-200',
  onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  risk: 'bg-red-50 text-red-700 border-red-200',
  scaling: 'bg-purple-50 text-purple-700 border-purple-200',
}

const projectStatusLabel: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
}

const projectStatusColor: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const taskStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const taskStatusColor: Record<string, string> = {
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
}

const priorityLabel: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
  critical: 'Critica',
}

const priorityColor: Record<string, string> = {
  low: 'bg-green-50 text-green-600 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-600 border-orange-200',
  urgent: 'bg-red-50 text-red-600 border-red-200',
  critical: 'bg-red-100 text-red-700 border-red-300',
}

// -- Types --------------------------------------------------------------------

interface ClientData {
  id: string
  name: string
  brand?: string | null
  company?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  contact_person?: string | null
  contactPerson?: string | null
  country?: string | null
  currency: string
  industry?: string | null
  website?: string | null
  notes?: string | null
  observations?: string | null
  status: string
  monthly_value?: string | null
  monthlyFee?: string | null
  service_type?: string | null
  serviceType?: string | null
  contract_start?: string | null
  contractStart?: string | null
  contract_end?: string | null
  contractEnd?: string | null
  pays_percentage: boolean
  percentage_value: number | null
  logo_url?: string | null
  created_at?: string
}

interface Project {
  id: string
  name: string
  status: string
  clientId: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  color?: string | null
  description?: string | null
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  deadline?: string | null
  due_date?: string | null
  projectId?: string | null
  assignedTo?: string[]
  createdAt?: string
  completed_at?: string | null
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  category?: string | null
  client_id?: string | null
  currency?: string
}

interface Invoice {
  id: string
  number: string
  status: string
  total: number
  due_date?: string | null
  created_at: string
  client_id?: string | null
}

interface Interaction {
  id: string
  type: string
  date: string
  duration_minutes: number | null
  summary: string
  outcome: string | null
  next_action: string | null
  created_at: string
}

interface Asset {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size?: number | null
  category?: string | null
  created_at: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number, currency = 'USD') {
  return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
}

function relativeDate(d: string) {
  const now = new Date()
  const date = new Date(d)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `hace ${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `hace ${diffD}d`
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(d: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// -- Tabs config --------------------------------------------------------------

const TABS = [
  { value: 'resumen', label: 'Resumen', icon: Activity },
  { value: 'proyectos', label: 'Proyectos', icon: Briefcase },
  { value: 'tareas', label: 'Tareas', icon: ClipboardList },
  { value: 'finanzas', label: 'Finanzas', icon: DollarSign },
  { value: 'comunicaciones', label: 'Comunicaciones', icon: MessageCircle },
  { value: 'documentos', label: 'Documentos', icon: BookOpen },
  { value: 'investigacion', label: 'Investigacion', icon: TrendingUp },
]

// -- Interaction types --------------------------------------------------------

const INTERACTION_TYPES = [
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-600' },
  { value: 'call', label: 'Llamada', icon: Phone, color: 'bg-green-100 text-green-600' },
  { value: 'meeting', label: 'Reunion', icon: Users, color: 'bg-purple-100 text-purple-600' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-100 text-emerald-600' },
  { value: 'note', label: 'Nota', icon: FileText, color: 'bg-amber-100 text-amber-600' },
  { value: 'other', label: 'Otro', icon: ClipboardList, color: 'bg-slate-100 text-slate-600' },
]

function getInteractionMeta(type: string) {
  return INTERACTION_TYPES.find((t) => t.value === type) || INTERACTION_TYPES[5]
}

// -- Skeleton -----------------------------------------------------------------

function MetricSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-slate-100" />
          <div className="h-5 w-16 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5 space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn('h-4 rounded bg-slate-100', i === 0 ? 'w-1/3' : i === 1 ? 'w-2/3' : 'w-1/2')} />
      ))}
    </div>
  )
}

// -- Component ----------------------------------------------------------------

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('resumen')

  // Overview data
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [timeHours, setTimeHours] = useState<number>(0)
  const [assets, setAssets] = useState<Asset[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [showCommModal, setShowCommModal] = useState(false)

  // Load client
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setClient(data.data || data)
        } else {
          router.push('/clients')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId, router])

  // Load overview data in parallel
  useEffect(() => {
    if (!clientId) return

    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1
    const prevYear = curMonth === 1 ? curYear - 1 : curYear

    const firstOfMonth = `${curYear}-${String(curMonth).padStart(2, '0')}-01`
    const lastOfMonth = new Date(curYear, curMonth, 0).toISOString().split('T')[0]

    async function loadAll() {
      try {
        const [
          projectsRes,
          tasksRes,
          transactionsRes,
          prevTransactionsRes,
          invoicesRes,
          interactionsRes,
          timeRes,
          assetsRes,
          bookmarksRes,
        ] = await Promise.all([
          fetch(`/api/projects?client_id=${clientId}&limit=100`),
          fetch(`/api/projects?client_id=${clientId}&limit=100`).then(async (r) => {
            if (!r.ok) return []
            const pData = await r.json()
            const projectsList = pData.data || []
            if (projectsList.length === 0) return []
            // Fetch tasks for each project
            const taskPromises = projectsList.map((p: Project) =>
              fetch(`/api/tasks?project_id=${p.id}&limit=100`).then(async (tr) => {
                if (!tr.ok) return []
                const tData = await tr.json()
                return (tData.data || []).map((t: Task) => ({ ...t, _projectName: p.name }))
              })
            )
            const allTasks = await Promise.all(taskPromises)
            return allTasks.flat()
          }),
          fetch(`/api/finances?month=${curMonth}&year=${curYear}`),
          fetch(`/api/finances?month=${prevMonth}&year=${prevYear}`),
          fetch(`/api/finances/invoices?client_id=${clientId}`),
          fetch(`/api/communications?client_id=${clientId}&limit=50`),
          fetch(`/api/time-entries/summary?from=${firstOfMonth}&to=${lastOfMonth}`),
          fetch(`/api/assets?client_id=${clientId}&limit=50`),
          fetch('/api/bookmarks'),
        ])

        // Projects
        if (projectsRes.ok) {
          const pData = await projectsRes.json()
          setProjects(pData.data || [])
        }

        // Tasks (already resolved)
        setTasks(tasksRes as Task[])

        // Transactions this month
        if (transactionsRes.ok) {
          const tData = await transactionsRes.json()
          const allTx = tData.data || tData.transactions || []
          setTransactions(allTx.filter((t: Transaction) => t.client_id === clientId))
        }

        // Transactions prev month
        if (prevTransactionsRes.ok) {
          const tData = await prevTransactionsRes.json()
          const allTx = tData.data || tData.transactions || []
          setPrevMonthTransactions(allTx.filter((t: Transaction) => t.client_id === clientId))
        }

        // Invoices
        if (invoicesRes.ok) {
          const iData = await invoicesRes.json()
          setInvoices(iData.data || [])
        }

        // Interactions
        if (interactionsRes.ok) {
          const cData = await interactionsRes.json()
          setInteractions(cData.data || [])
        }

        // Time entries
        if (timeRes.ok) {
          const teData = await timeRes.json()
          // Extract hours for this client
          const byClient = teData.byClient || {}
          const clientEntry = byClient[clientId]
          if (clientEntry) {
            setTimeHours(Math.round((clientEntry.minutes || 0) / 60 * 10) / 10)
          }
        }

        // Assets
        if (assetsRes.ok) {
          const aData = await assetsRes.json()
          setAssets(aData.data || [])
        }

        // Bookmarks
        if (bookmarksRes.ok) {
          const bData = await bookmarksRes.json()
          const all = bData.data || []
          setBookmarks(all.filter((b: Bookmark) => b.client_id === clientId))
        }
      } catch (err) {
        console.error('Error loading overview data:', err)
      } finally {
        setOverviewLoading(false)
      }
    }
    loadAll()
  }, [clientId])

  // Computed metrics
  const revenueThisMonth = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const revenuePrevMonth = prevMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const revenueChange = revenuePrevMonth > 0 ? ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100 : revenueThisMonth > 0 ? 100 : 0
  const activeProjects = projects.filter(p => p.status === 'active').length
  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length
  const lastComm = interactions.length > 0 ? interactions[0] : null

  const now = new Date()
  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)
  const upcomingDeadlines = tasks.filter(t => {
    const dl = t.deadline || t.due_date
    if (!dl || t.status === 'completed' || t.status === 'cancelled') return false
    const dd = new Date(dl)
    return dd >= now && dd <= in7Days
  })

  // Invoice summary
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const outstanding = totalInvoiced - totalPaid

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 space-y-3">
            <div className="h-5 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (!client) return null

  const clientName = client.name
  const contactPerson = client.contactPerson || client.contact_person
  const monthlyFee = client.monthlyFee || client.monthly_value
  const serviceType = client.serviceType || client.service_type
  const contractStart = client.contractStart || client.contract_start
  const contractEnd = client.contractEnd || client.contract_end

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {client.logo_url ? (
            <img src={client.logo_url} alt={clientName} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white', getColor(clientName))}>
              {getInitials(clientName)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{clientName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {(client.brand || client.company) && (
                <span className="text-sm text-slate-500">{client.brand || client.company}</span>
              )}
              {(client.brand || client.company) && client.industry && (
                <span className="text-slate-300">-</span>
              )}
              {client.industry && (
                <span className="text-sm text-slate-500">{client.industry}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.pays_percentage && client.percentage_value != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
              <Percent className="h-3.5 w-3.5" />
              Comision: {client.percentage_value}%
            </span>
          )}
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium', statusColor[client.status] || statusColor.inactive)}>
            {statusLabel[client.status] || client.status}
          </span>
        </div>
      </div>

      {/* ── Overview Panel ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {overviewLoading ? (
          Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          <>
            {/* Revenue this month */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">Ingresos mes</p>
                  <p className="text-lg font-bold text-slate-900">${revenueThisMonth.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {revenueChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={cn('text-xs font-medium', revenueChange >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-400">vs mes anterior</span>
              </div>
            </div>

            {/* Hours logged */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Timer className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">Horas este mes</p>
                  <p className="text-lg font-bold text-slate-900">{timeHours}h</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Tiempo registrado</p>
            </div>

            {/* Active projects */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">Proyectos activos</p>
                  <p className="text-lg font-bold text-slate-900">{activeProjects}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{projects.length} totales</p>
            </div>

            {/* Pending tasks */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">Tareas pendientes</p>
                  <p className="text-lg font-bold text-slate-900">{pendingTasks}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{tasks.length} totales</p>
            </div>

            {/* Last communication */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50">
                  <MessageCircle className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">Ultima comunicacion</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {lastComm ? relativeDate(lastComm.date) : 'Sin registro'}
                  </p>
                </div>
              </div>
              {lastComm && (
                <p className="mt-2 text-xs text-slate-400 truncate">
                  {getInteractionMeta(lastComm.type).label}
                </p>
              )}
            </div>

            {/* Upcoming deadlines */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">Proximos vencimientos</p>
                  <p className="text-lg font-bold text-slate-900">{upcomingDeadlines.length}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">En los proximos 7 dias</p>
            </div>
          </>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowTaskModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Plus className="h-4 w-4 text-blue-500" />
          Agregar tarea
        </button>
        <button
          onClick={() => setShowTimeModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Timer className="h-4 w-4 text-green-500" />
          Registrar tiempo
        </button>
        <Link
          href={`/finances?tab=invoices&client_id=${clientId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Receipt className="h-4 w-4 text-purple-500" />
          Crear factura
        </Link>
        <button
          onClick={() => setShowCommModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-cyan-500" />
          Registrar comunicacion
        </button>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--border-base)] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}

      {/* Tab: Resumen */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact info */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Informacion de contacto
              </h2>
              <div className="space-y-4">
                {contactPerson && (
                  <InfoRow icon={User} label="Persona de contacto" value={contactPerson} />
                )}
                {client.email && (
                  <InfoRow icon={Mail} label="Email" value={client.email} href={`mailto:${client.email}`} />
                )}
                {client.phone && (
                  <InfoRow icon={Phone} label="Telefono" value={client.phone} />
                )}
                {client.website && (
                  <InfoRow icon={Globe} label="Sitio web" value={client.website} href={client.website} external />
                )}
                {client.country && (
                  <InfoRow icon={Building2} label="Pais" value={client.country} />
                )}
              </div>
            </div>

            {/* Financial & account info */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Cuenta y finanzas
              </h2>
              <div className="space-y-4">
                {monthlyFee && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Valor mensual</p>
                      <p className="text-lg font-semibold text-slate-900">
                        ${Number(monthlyFee).toLocaleString()}{' '}
                        <span className="text-sm font-normal text-slate-500">{client.currency}/mes</span>
                      </p>
                    </div>
                  </div>
                )}
                {client.pays_percentage && client.percentage_value != null && (
                  <div className="flex items-start gap-3">
                    <Percent className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Pago por porcentaje</p>
                      <p className="text-lg font-semibold text-purple-700">
                        {client.percentage_value}%{' '}
                        <span className="text-sm font-normal text-slate-500">de comision</span>
                      </p>
                    </div>
                  </div>
                )}
                {serviceType && (
                  <InfoRow icon={ClipboardList} label="Tipo de servicio" value={serviceType} />
                )}
                {(contractStart || contractEnd) && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Contrato</p>
                      <p className="text-sm text-slate-900">
                        {contractStart && formatDate(contractStart)}
                        {contractStart && contractEnd && ' - '}
                        {contractEnd && formatDate(contractEnd)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Actividad reciente
            </h2>
            <RecentActivityList
              tasks={tasks}
              interactions={interactions}
              invoices={invoices}
              projects={projects}
            />
          </div>

          {/* Upcoming deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Proximos vencimientos (7 dias)
              </h2>
              <div className="space-y-2">
                {upcomingDeadlines.map((task) => {
                  const dl = task.deadline || task.due_date || ''
                  const days = daysUntil(dl)
                  return (
                    <div key={task.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(dl)}</p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        days <= 1 ? 'bg-red-50 text-red-600' : days <= 3 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      )}>
                        {days === 0 ? 'Hoy' : days === 1 ? 'Manana' : `${days} dias`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {(client.notes || client.observations) && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Notas internas
              </h2>
              {client.notes && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 mb-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
              {client.observations && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Observaciones</h3>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.observations}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Proyectos */}
      {activeTab === 'proyectos' && (
        <div className="space-y-4">
          {overviewLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <CardSkeleton key={i} lines={4} />)}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState icon={Briefcase} message="No hay proyectos para este cliente" sub="Crea un proyecto y asignalo a este cliente" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const projectTasks = tasks.filter(t => t.projectId === project.id)
                const completed = projectTasks.filter(t => t.status === 'completed').length
                const total = projectTasks.length
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {project.color && (
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                        )}
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </h3>
                      </div>
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', projectStatusColor[project.status] || projectStatusColor.active)}>
                        {projectStatusLabel[project.status] || project.status}
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                    )}

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Progreso</span>
                        <span className="text-xs font-medium text-slate-700">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{completed}/{total} tareas</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        {project.endDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(project.endDate)}
                          </span>
                        )}
                        {project.budget != null && project.budget > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${project.budget.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Tareas */}
      {activeTab === 'tareas' && (
        <div className="space-y-6">
          {overviewLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No hay tareas para este cliente" sub="Crea tareas dentro de los proyectos de este cliente" />
          ) : (
            <>
              {/* Group by status */}
              {(['pending', 'in_progress', 'completed'] as const).map((statusKey) => {
                const grouped = tasks.filter(t => t.status === statusKey)
                if (grouped.length === 0) return null
                return (
                  <div key={statusKey}>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', statusKey === 'completed' ? 'bg-green-500' : statusKey === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400')} />
                      {taskStatusLabel[statusKey]} ({grouped.length})
                    </h3>
                    <div className="space-y-2">
                      {grouped.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {(task as Task & { _projectName?: string })._projectName && (
                                <span className="text-xs text-slate-400">{(task as Task & { _projectName?: string })._projectName}</span>
                              )}
                              {(task.deadline || task.due_date) && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(task.deadline || task.due_date || '')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.priority && (
                              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', priorityColor[task.priority] || priorityColor.medium)}>
                                {priorityLabel[task.priority] || task.priority}
                              </span>
                            )}
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', taskStatusColor[task.status] || taskStatusColor.pending)}>
                              {taskStatusLabel[task.status] || task.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Tab: Finanzas */}
      {activeTab === 'finanzas' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <Receipt className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm text-slate-500">Total facturado</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">${totalInvoiced.toLocaleString()}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-sm text-slate-500">Total cobrado</p>
              </div>
              <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-sm text-slate-500">Saldo pendiente</p>
              </div>
              <p className={cn('text-2xl font-bold', outstanding > 0 ? 'text-amber-600' : 'text-slate-900')}>${outstanding.toLocaleString()}</p>
            </div>
          </div>

          {/* Recent invoices */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Facturas ({invoices.length})
            </h2>
            {invoices.length === 0 ? (
              <EmptyState icon={Receipt} message="No hay facturas para este cliente" small />
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 10).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inv.number}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(inv.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">${(inv.total || 0).toLocaleString()}</span>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Transacciones del mes ({transactions.length})
            </h2>
            {transactions.length === 0 ? (
              <EmptyState icon={DollarSign} message="No hay transacciones este mes" small />
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      )}>
                        {tx.type === 'income' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                        <p className="text-xs text-slate-500">{formatDate(tx.date)}{tx.category ? ` - ${tx.category}` : ''}</p>
                      </div>
                    </div>
                    <span className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Comunicaciones */}
      {activeTab === 'comunicaciones' && (
        <ClientInteractions
          clientId={clientId}
          interactions={interactions}
          setInteractions={setInteractions}
          loading={overviewLoading}
        />
      )}

      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          {/* Bookmarks */}
          <ClientBookmarks
            clientId={clientId}
            clientName={clientName}
            bookmarks={bookmarks}
            setBookmarks={setBookmarks}
            loading={overviewLoading}
          />

          {/* Assets */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Archivos ({assets.length})
            </h2>
            {overviewLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2].map(i => <CardSkeleton key={i} />)}
              </div>
            ) : assets.length === 0 ? (
              <EmptyState icon={Image} message="No hay archivos para este cliente" small />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{asset.name}</p>
                      <p className="text-xs text-slate-500">
                        {asset.file_type}{asset.category ? ` - ${asset.category}` : ''} - {formatDate(asset.created_at)}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Investigacion */}
      {activeTab === 'investigacion' && (
        <MarketResearchTab clientId={clientId} clientName={clientName} />
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showTaskModal && (
        <QuickTaskModal
          clientId={clientId}
          projects={projects}
          onClose={() => setShowTaskModal(false)}
          onCreated={(task) => {
            setTasks(prev => [...prev, task])
            setShowTaskModal(false)
          }}
        />
      )}

      {showTimeModal && (
        <QuickTimeModal
          clientId={clientId}
          projects={projects}
          onClose={() => setShowTimeModal(false)}
          onCreated={() => setShowTimeModal(false)}
        />
      )}

      {showCommModal && (
        <QuickCommModal
          clientId={clientId}
          onClose={() => setShowCommModal(false)}
          onCreated={(interaction) => {
            setInteractions(prev => [interaction, ...prev])
            setShowCommModal(false)
          }}
        />
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
  external?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        {href ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-sm text-blue-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-slate-900">{value}</p>
        )}
      </div>
    </div>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-50 text-slate-600 border-slate-200',
    sent: 'bg-blue-50 text-blue-600 border-blue-200',
    paid: 'bg-green-50 text-green-600 border-green-200',
    overdue: 'bg-red-50 text-red-600 border-red-200',
  }
  const labelMap: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
    overdue: 'Vencida',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', map[status] || map.draft)}>
      {labelMap[status] || status}
    </span>
  )
}

function EmptyState({
  icon: Icon,
  message,
  sub,
  small,
}: {
  icon: React.ComponentType<{ className?: string }>
  message: string
  sub?: string
  small?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', small ? 'py-8' : 'py-12 rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white')}>
      <Icon className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Recent Activity List ────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'task' | 'interaction' | 'invoice' | 'project'
  title: string
  subtitle: string
  date: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

function RecentActivityList({
  tasks,
  interactions,
  invoices,
  projects,
}: {
  tasks: Task[]
  interactions: Interaction[]
  invoices: Invoice[]
  projects: Project[]
}) {
  const items: ActivityItem[] = []

  // Tasks (most recent by createdAt)
  for (const task of tasks.slice(0, 20)) {
    items.push({
      id: `task-${task.id}`,
      type: 'task',
      title: task.title,
      subtitle: task.status === 'completed' ? 'Tarea completada' : `Tarea ${taskStatusLabel[task.status] || task.status}`,
      date: task.completed_at || task.createdAt || '',
      icon: CheckCircle2,
      iconColor: task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600',
    })
  }

  // Interactions
  for (const int of interactions.slice(0, 10)) {
    const meta = getInteractionMeta(int.type)
    items.push({
      id: `int-${int.id}`,
      type: 'interaction',
      title: int.summary.length > 80 ? int.summary.slice(0, 80) + '...' : int.summary,
      subtitle: `${meta.label} registrada`,
      date: int.date || int.created_at,
      icon: meta.icon,
      iconColor: meta.color,
    })
  }

  // Invoices
  for (const inv of invoices.slice(0, 5)) {
    items.push({
      id: `inv-${inv.id}`,
      type: 'invoice',
      title: `Factura ${inv.number}`,
      subtitle: `$${(inv.total || 0).toLocaleString()} - ${inv.status === 'paid' ? 'Pagada' : inv.status === 'sent' ? 'Enviada' : 'Borrador'}`,
      date: inv.created_at,
      icon: Receipt,
      iconColor: 'bg-purple-100 text-purple-600',
    })
  }

  // Projects
  for (const proj of projects.slice(0, 5)) {
    items.push({
      id: `proj-${proj.id}`,
      type: 'project',
      title: proj.name,
      subtitle: `Proyecto ${projectStatusLabel[proj.status] || proj.status}`,
      date: proj.startDate || '',
      icon: Briefcase,
      iconColor: 'bg-indigo-100 text-indigo-600',
    })
  }

  // Sort by date desc and take 10
  items.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const recentItems = items.slice(0, 10)

  if (recentItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No hay actividad reciente</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recentItems.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0', item.iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
              <p className="text-xs text-slate-500">{item.subtitle}</p>
            </div>
            {item.date && (
              <span className="text-xs text-slate-400 flex-shrink-0">{relativeDate(item.date)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Client Bookmarks Sub-component ──────────────────────────────────────────

function ClientBookmarks({
  clientId,
  clientName,
  bookmarks,
  setBookmarks,
  loading,
}: {
  clientId: string
  clientName: string
  bookmarks: Bookmark[]
  setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>
  loading: boolean
}) {
  const [confirmDeleteBookmarkId, setConfirmDeleteBookmarkId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setConfirmDeleteBookmarkId(id)
  }

  async function executeDeleteBookmark(id: string) {
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, pinned } : b))
    await fetch(`/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4 space-y-3">
            <div className="h-8 w-8 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
        Documentos vinculados ({bookmarks.length})
      </h2>
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen size={24} strokeWidth={1.5} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-500 mb-4">No hay documentos vinculados a {clientName}</p>
          <Link href="/docs" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Plus size={14} strokeWidth={1.5} /> Agregar documento
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map(b => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              onEdit={() => {}}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* Confirm delete bookmark modal */}
      {confirmDeleteBookmarkId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirmar eliminacion</h3>
            <p className="text-gray-600 mb-4">Eliminar este marcador? Esta accion no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteBookmarkId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => { executeDeleteBookmark(confirmDeleteBookmarkId); setConfirmDeleteBookmarkId(null) }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Client Interactions Sub-component ──────────────────────────────────────

function ClientInteractions({
  clientId,
  interactions,
  setInteractions,
  loading,
}: {
  clientId: string
  interactions: Interaction[]
  setInteractions: React.Dispatch<React.SetStateAction<Interaction[]>>
  loading: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'note', date: '', duration_minutes: '', summary: '', outcome: '', next_action: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.summary.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          date: form.date || undefined,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
          summary: form.summary,
          outcome: form.outcome || undefined,
          next_action: form.next_action || undefined,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setInteractions((prev) => [d.data, ...prev])
        setForm({ type: 'note', date: '', duration_minutes: '', summary: '', outcome: '', next_action: '' })
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Historial de comunicaciones ({interactions.length})
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar interaccion
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <InteractionForm
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Timeline */}
      {interactions.length === 0 ? (
        <EmptyState icon={MessageCircle} message="No hay interacciones registradas" sub="Registra llamadas, emails, reuniones y mas" />
      ) : (
        <div className="space-y-0">
          {interactions.map((item, idx) => {
            const meta = getInteractionMeta(item.type)
            const Icon = meta.icon
            return (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('flex items-center justify-center h-8 w-8 rounded-full', meta.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {idx < interactions.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="rounded-lg border border-[var(--border-base)] bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', meta.color)}>
                          {meta.label}
                        </span>
                        {item.duration_minutes && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {item.duration_minutes} min
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{relativeDate(item.date)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{item.summary}</p>
                    {item.outcome && (
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-medium">Resultado:</span> {item.outcome}
                      </p>
                    )}
                    {item.next_action && (
                      <p className="text-xs text-blue-600 mt-1">
                        <span className="font-medium">Proxima accion:</span> {item.next_action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Interaction Form ────────────────────────────────────────────────────────

function InteractionForm({
  form,
  setForm,
  saving,
  onSubmit,
  onCancel,
}: {
  form: { type: string; date: string; duration_minutes: string; summary: string; outcome: string; next_action: string }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[var(--radius-lg)] border border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {(form.type === 'call' || form.type === 'meeting') && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duracion (min)</label>
            <input
              type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="30"
              min={1}
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Resumen *</label>
        <textarea
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
          placeholder="Describe la interaccion..."
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Resultado</label>
          <input
            value={form.outcome}
            onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Resultado de la interaccion"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Proxima accion</label>
          <input
            value={form.next_action}
            onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Siguiente paso"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Quick Task Modal ────────────────────────────────────────────────────────

function QuickTaskModal({
  clientId,
  projects,
  onClose,
  onCreated,
}: {
  clientId: string
  projects: Project[]
  onClose: () => void
  onCreated: (task: Task) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    projectId: projects.length > 0 ? projects[0].id : '',
    deadline: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.projectId) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          projectId: form.projectId,
          deadline: form.deadline || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data.data || data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Agregar tarea" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Proyecto *</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm(f => ({ ...f, projectId: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Seleccionar proyecto</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Este cliente no tiene proyectos. Crea uno primero.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Titulo *</label>
          <input
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nombre de la tarea"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Descripcion</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Descripcion opcional"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
            <select
              value={form.priority}
              onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !form.projectId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Quick Time Entry Modal ──────────────────────────────────────────────────

function QuickTimeModal({
  clientId,
  projects,
  onClose,
  onCreated,
}: {
  clientId: string
  projects: Project[]
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '',
    duration_minutes: '',
    projectId: projects.length > 0 ? projects[0].id : '',
    billable: true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.duration_minutes) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const duration = parseInt(form.duration_minutes)
      const start = new Date(Date.now() - duration * 60000).toISOString()
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          project_id: form.projectId || undefined,
          description: form.description || undefined,
          start_time: start,
          end_time: now,
          duration_minutes: duration,
          billable: form.billable,
          status: 'stopped',
        }),
      })
      if (res.ok) {
        onCreated()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Registrar tiempo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Proyecto</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm(f => ({ ...f, projectId: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Sin proyecto</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Duracion (minutos) *</label>
          <input
            type="number"
            value={form.duration_minutes}
            onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="60"
            min={1}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Descripcion</label>
          <input
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Que hiciste?"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="billable"
            checked={form.billable}
            onChange={(e) => setForm(f => ({ ...f, billable: e.target.checked }))}
            className="rounded border-slate-300"
          />
          <label htmlFor="billable" className="text-sm text-slate-600">Facturable</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Quick Communication Modal ───────────────────────────────────────────────

function QuickCommModal({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string
  onClose: () => void
  onCreated: (interaction: Interaction) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'note', date: '', duration_minutes: '', summary: '', outcome: '', next_action: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.summary.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          date: form.date || undefined,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
          summary: form.summary,
          outcome: form.outcome || undefined,
          next_action: form.next_action || undefined,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        onCreated(d.data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Registrar comunicacion" onClose={onClose}>
      <InteractionForm
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </ModalShell>
  )
}

// ── Modal Shell ─────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[var(--radius-lg)] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-base)]">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
