'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn, formatDate } from '@/lib/utils'
import {
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { InfoBanner } from '@/components/shared/InfoBanner'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Approval {
  id: string
  title: string
  description: string | null
  client_id: string | null
  task_id: string | null
  doc_id: string | null
  attachments: unknown[]
  status: string
  client_comment: string | null
  internal_notes: string | null
  expires_at: string | null
  responded_at: string | null
  token: string
  created_by: string | null
  created_at: string
  updated_at: string
}

interface Client {
  id: string
  name: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  pending: { label: 'Pendiente', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  approved: { label: 'Aprobado', badge: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rechazado', badge: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  revision_requested: { label: 'Revision solicitada', badge: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { user } = useCurrentUser()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formClientId, setFormClientId] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const loadApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/approvals?${params}`)
      if (res.ok) {
        const data = await res.json()
        setApprovals(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?limit=100')
      if (res.ok) {
        const data = await res.json()
        setClients(data.data || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadApprovals() }, [loadApprovals])
  useEffect(() => { loadClients() }, [loadClients])

  async function handleCreateApproval(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim()) return
    setFormSaving(true)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          client_id: formClientId || null,
          expires_at: formExpiresAt || null,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormTitle('')
        setFormDescription('')
        setFormClientId('')
        setFormExpiresAt('')
        loadApprovals()
      }
    } finally {
      setFormSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    const res = await fetch(`/api/approvals/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      setApprovals((prev) => prev.filter((a) => a.id !== deleteId))
    }
    setDeleteId(null)
  }

  function copyApprovalLink(approval: Approval) {
    const url = `${window.location.origin}/portal/approval/${approval.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(approval.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getClientName(clientId: string | null) {
    if (!clientId) return null
    return clients.find((c) => c.id === clientId)?.name || null
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <InfoBanner id="approvals" title="Aprobaciones" description="Envia solicitudes de aprobacion a tus clientes. Ellos pueden aprobar, rechazar o solicitar revisiones desde un link unico." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aprobaciones</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona solicitudes de aprobacion de clientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-4">
                <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
                <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="ml-auto h-5 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No hay solicitudes</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Crea una solicitud de aprobacion para enviarla a tu cliente</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva solicitud
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending
            const StatusIcon = config.icon
            const isExpanded = expandedId === approval.id
            const clientName = getClientName(approval.client_id)

            return (
              <div key={approval.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                >
                  <StatusIcon className={cn('h-5 w-5 flex-shrink-0', {
                    'text-yellow-500': approval.status === 'pending',
                    'text-green-500': approval.status === 'approved',
                    'text-red-500': approval.status === 'rejected',
                    'text-orange-500': approval.status === 'revision_requested',
                  })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{approval.title}</p>
                    {clientName && (
                      <p className="text-xs text-slate-500 mt-0.5">{clientName}</p>
                    )}
                  </div>
                  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.badge)}>
                    {config.label}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:block">{formatDate(approval.created_at)}</span>
                  {approval.responded_at && (
                    <span className="text-xs text-slate-400 hidden md:block">Resp: {formatDate(approval.responded_at)}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyApprovalLink(approval) }}
                      className="rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Copiar enlace de aprobacion"
                    >
                      {copiedId === approval.id ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(approval.id) }}
                      className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3">
                    {approval.description && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Descripcion</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{approval.description}</p>
                      </div>
                    )}
                    {approval.client_comment && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Comentario del cliente</p>
                        <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 p-3 whitespace-pre-wrap">{approval.client_comment}</p>
                      </div>
                    )}
                    {approval.internal_notes && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notas internas</p>
                        <p className="text-sm text-slate-600 italic whitespace-pre-wrap">{approval.internal_notes}</p>
                      </div>
                    )}
                    {approval.expires_at && (
                      <p className="text-xs text-slate-500">Expira: {formatDate(approval.expires_at)}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`/portal/approval/${approval.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver pagina del cliente
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Nueva solicitud de aprobacion</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateApproval} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titulo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Aprobacion de diseno landing page"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                  placeholder="Detalla lo que necesitas que el cliente apruebe..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Sin cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de expiracion</label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {formSaving ? 'Creando...' : 'Crear solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirmar eliminacion</h3>
            <p className="text-gray-600 mb-4">Esta accion no se puede deshacer. El enlace de aprobacion dejara de funcionar.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
