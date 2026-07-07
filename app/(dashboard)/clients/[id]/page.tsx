'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MarketResearchTab } from '@/components/market-research/MarketResearchTab'
import Link from 'next/link'
import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft,
  Globe,
  Mail,
  TrendingUp,
  Phone,
  DollarSign,
  Building2,
  Calendar,
  User,
  FileText,
  ClipboardList,
  StickyNote,
  Briefcase,
  Percent,
  BookOpen,
  Plus,
  MoreVertical,
  Pin,
  PinOff,
  Pencil,
  Link2,
  Trash2,
  MessageCircle,
  Users,
  Clock,
} from 'lucide-react'
import { BookmarkCard, type Bookmark } from '@/components/bookmarks/BookmarkCard'
import { getInitials } from '@/lib/utils'

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

// -- Types --------------------------------------------------------------------

interface ClientDetail {
  id: string
  name: string
  brand: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  contactPerson: string | null
  country: string | null
  currency: string
  industry: string | null
  website: string | null
  notes: string | null
  observations: string | null
  status: string
  monthlyFee: string | null
  serviceType: string | null
  contractStart: string | null
  contractEnd: string | null
  pays_percentage: boolean
  percentage_value: number | null
  accountManager: { id: string; fullName: string } | null
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    deadline: string | null
    createdBy: { fullName: string }
  }>
  reports: Array<{
    id: string
    title: string
    status: string
    reportType: string
    createdAt: string
    submittedBy: { fullName: string }
  }>
  audits: Array<{
    id: string
    title: string
    status: string
    overallStatus: string | null
    complianceScore: number | null
    executedAt: string | null
  }>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// -- Component ----------------------------------------------------------------

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/clients/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setClient(data.data)
        } else {
          router.push('/clients')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 space-y-3"
          >
            <div className="h-5 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white ${getColor(client.name)}`}
          >
            {getInitials(client.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {client.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {client.brand && (
                <span className="text-sm text-slate-500">{client.brand}</span>
              )}
              {client.brand && client.industry && (
                <span className="text-slate-300">-</span>
              )}
              {client.industry && (
                <span className="text-sm text-slate-500">
                  {client.industry}
                </span>
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
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${statusColor[client.status] || statusColor.inactive}`}
          >
            {statusLabel[client.status] || client.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="resumen">
        <Tabs.List className="flex border-b border-slate-200">
          {[
            { value: 'resumen', label: 'Resumen', icon: User },
            { value: 'proyectos', label: 'Proyectos', icon: Briefcase },
            { value: 'reportes', label: 'Reportes', icon: FileText },
            { value: 'notas', label: 'Notas', icon: StickyNote },
            { value: 'documentos', label: 'Documentos', icon: BookOpen },
            { value: 'historial', label: 'Historial', icon: MessageCircle },
            { value: 'investigacion', label: 'Investigación', icon: TrendingUp },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Resumen tab */}
        <Tabs.Content value="resumen" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact info */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Informacion de contacto
              </h2>
              <div className="space-y-4">
                {client.contactPerson && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">
                        Persona de contacto
                      </p>
                      <p className="text-sm text-slate-900">
                        {client.contactPerson}
                      </p>
                    </div>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <a
                        href={`mailto:${client.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {client.email}
                      </a>
                    </div>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Telefono</p>
                      <p className="text-sm text-slate-900">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Sitio web</p>
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {client.website}
                      </a>
                    </div>
                  </div>
                )}
                {client.country && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Pais</p>
                      <p className="text-sm text-slate-900">{client.country}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial & account info */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Cuenta y finanzas
              </h2>
              <div className="space-y-4">
                {client.monthlyFee && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Valor mensual</p>
                      <p className="text-lg font-semibold text-slate-900">
                        ${Number(client.monthlyFee).toLocaleString()}{' '}
                        <span className="text-sm font-normal text-slate-500">
                          {client.currency}/mes
                        </span>
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
                        <span className="text-sm font-normal text-slate-500">
                          de comision
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {client.serviceType && (
                  <div className="flex items-start gap-3">
                    <ClipboardList className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Tipo de servicio</p>
                      <p className="text-sm text-slate-900">
                        {client.serviceType}
                      </p>
                    </div>
                  </div>
                )}
                {(client.contractStart || client.contractEnd) && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Contrato</p>
                      <p className="text-sm text-slate-900">
                        {client.contractStart &&
                          formatDate(client.contractStart)}
                        {client.contractStart && client.contractEnd && ' - '}
                        {client.contractEnd && formatDate(client.contractEnd)}
                      </p>
                    </div>
                  </div>
                )}
                {client.accountManager && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Account Manager</p>
                      <p className="text-sm text-slate-900">
                        {client.accountManager?.fullName || 'Sin asignar'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent tasks */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Tareas recientes
              </h2>
              {(client.tasks || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  No hay tareas asignadas a este cliente
                </p>
              ) : (
                <div className="space-y-2">
                  {(client.tasks || []).slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          por {task.createdBy?.fullName || 'Usuario'}
                          {task.deadline && ` - Vence: ${formatDate(task.deadline)}`}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          task.status === 'completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : task.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {task.status === 'completed'
                          ? 'Completada'
                          : task.status === 'in_progress'
                            ? 'En progreso'
                            : task.status === 'pending'
                              ? 'Pendiente'
                              : task.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>

        {/* Proyectos tab */}
        <Tabs.Content value="proyectos" className="pt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Proyectos del cliente
            </h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Los proyectos asociados a este cliente aparecen aqui.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Asigna proyectos desde el modulo de Proyectos.
              </p>
            </div>
          </div>
        </Tabs.Content>

        {/* Reportes tab */}
        <Tabs.Content value="reportes" className="pt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Reportes del cliente ({(client.reports || []).length})
            </h2>
            {(client.reports || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  No hay reportes para este cliente
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(client.reports || []).map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {report.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        por {report.submittedBy?.fullName || 'Usuario'} -{' '}
                        {formatDate(report.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border bg-blue-50 text-blue-700 border-blue-200 px-2.5 py-0.5 text-xs font-medium">
                      {report.reportType}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Notas tab */}
        <Tabs.Content value="notas" className="pt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Notas internas
            </h2>
            {client.notes ? (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">
                No hay notas registradas para este cliente
              </p>
            )}

            {client.observations && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Observaciones
                </h3>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {client.observations}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Documentos tab */}
        <Tabs.Content value="documentos" className="pt-6">
          <ClientBookmarks clientId={client.id} clientName={client.name} />
        </Tabs.Content>

        {/* Historial tab */}
        <Tabs.Content value="historial" className="pt-6">
          <ClientInteractions clientId={client.id} />
        </Tabs.Content>

        {/* Investigación tab */}
        <Tabs.Content value="investigacion" className="pt-6">
          <MarketResearchTab clientId={client.id} clientName={client.name} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

// ── Client Bookmarks Sub-component ──────────────────────────────────────────

function ClientBookmarks({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDeleteBookmarkId, setConfirmDeleteBookmarkId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bookmarks')
      .then(r => r.json())
      .then(d => {
        const all = d.data || []
        setBookmarks(all.filter((b: Bookmark) => b.client_id === clientId))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

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

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen size={24} strokeWidth={1.5} className="text-[var(--text-muted)] mb-2" />
        <p className="text-sm text-[var(--text-muted)] mb-4">No hay documentos vinculados a {clientName}</p>
        <Link
          href="/docs"
          className="btn-primary text-sm py-2 px-4"
        >
          <Plus size={14} strokeWidth={1.5} /> Agregar documento
        </Link>
      </div>
    )
  }

  return (
    <>
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

      {/* Confirm delete bookmark modal */}
      {confirmDeleteBookmarkId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-4">¿Eliminar este marcador? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteBookmarkId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => { executeDeleteBookmark(confirmDeleteBookmarkId); setConfirmDeleteBookmarkId(null) }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Client Interactions Sub-component ──────────────────────────────────────────

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

function ClientInteractions({ clientId }: { clientId: string }) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'note', date: '', duration_minutes: '', summary: '', outcome: '', next_action: '' })

  useEffect(() => {
    fetch(`/api/clients/${clientId}/interactions`)
      .then((r) => r.json())
      .then((d) => setInteractions(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

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
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
        ))}
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
        <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {interactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-slate-200 bg-white">
          <MessageCircle className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No hay interacciones registradas</p>
          <p className="text-xs text-slate-400 mt-1">Registra llamadas, emails, reuniones y mas</p>
        </div>
      ) : (
        <div className="space-y-0">
          {interactions.map((item, idx) => {
            const meta = getInteractionMeta(item.type)
            const Icon = meta.icon
            return (
              <div key={item.id} className="flex gap-3">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {idx < interactions.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                </div>
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
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
