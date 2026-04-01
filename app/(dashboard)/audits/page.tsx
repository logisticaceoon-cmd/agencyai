'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'
import { Search, Plus, Eye, Trash2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from '@/hooks/use-toast'

type AuditType = 'equipo' | 'cliente' | 'proceso' | 'financiero'
type Severity = 'critico' | 'alto' | 'medio' | 'bajo'
type AuditStatus = 'abierta' | 'en_revision' | 'resuelta' | 'desestimada'

interface Finding {
  titulo: string
  detalle: string
  severidad: Severity
}

interface Audit {
  id: string
  title: string
  type: AuditType
  severity: Severity
  audited: string
  status: AuditStatus
  description: string | null
  findings: Finding[]
  action_plan: string | null
  deadline: string | null
  resolved_at: string | null
  created_at: string
}

const TABS = [
  { key: 'todas', label: 'Todas' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'cliente', label: 'Clientes' },
  { key: 'proceso', label: 'Procesos' },
  { key: 'financiero', label: 'Financiero' },
] as const

const TYPE_LABELS: Record<AuditType, string> = {
  equipo: 'Equipo',
  cliente: 'Cliente',
  proceso: 'Proceso',
  financiero: 'Financiero',
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critico: 'bg-red-50 text-red-600',
  alto: 'bg-orange-50 text-orange-600',
  medio: 'bg-amber-50 text-amber-600',
  bajo: 'bg-emerald-50 text-emerald-600',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critico: 'Critico',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
}

const STATUS_LABELS: Record<AuditStatus, string> = {
  abierta: 'Abierta',
  en_revision: 'En revision',
  resuelta: 'Resuelta',
  desestimada: 'Desestimada',
}

const STATUS_STYLES: Record<AuditStatus, string> = {
  abierta: 'bg-blue-50 text-blue-600',
  en_revision: 'bg-amber-50 text-amber-600',
  resuelta: 'bg-emerald-50 text-emerald-600',
  desestimada: 'bg-slate-100 text-slate-500',
}

const TYPE_STYLES: Record<AuditType, string> = {
  equipo: 'bg-indigo-50 text-indigo-600',
  cliente: 'bg-teal-50 text-teal-600',
  proceso: 'bg-purple-50 text-purple-600',
  financiero: 'bg-cyan-50 text-cyan-600',
}

const emptyForm = {
  title: '',
  type: 'proceso' as AuditType,
  audited: '',
  severity: 'medio' as Severity,
  description: '',
  findings: [] as Finding[],
  action_plan: '',
  deadline: '',
}

export default function AuditsPage() {
  const { user } = useCurrentUser()
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [newFinding, setNewFinding] = useState<Finding>({ titulo: '', detalle: '', severidad: 'medio' })

  async function loadAudits() {
    setLoading(true)
    try {
      const res = await fetch('/api/audits')
      if (res.ok) {
        const data = await res.json()
        setAudits(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAudits() }, [])

  const filtered = activeTab === 'todas'
    ? audits
    : audits.filter((a) => a.type === activeTab)

  function addFinding() {
    if (!newFinding.titulo.trim()) return
    setForm((p) => ({ ...p, findings: [...p.findings, { ...newFinding }] }))
    setNewFinding({ titulo: '', detalle: '', severidad: 'medio' })
  }

  function removeFinding(idx: number) {
    setForm((p) => ({ ...p, findings: p.findings.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.audited.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: 'Auditoria creada correctamente' })
        setModalOpen(false)
        setForm({ ...emptyForm })
        loadAudits()
      } else {
        toast({ title: 'Error al crear auditoria', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta auditoria?')) return
    const res = await fetch(`/api/audits/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Auditoria eliminada' })
      loadAudits()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditorias"
        description="Gestion de auditorias internas y hallazgos"
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            <Plus size={16} strokeWidth={1.5} />
            Nueva auditoria
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border-base)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[var(--blue)] text-[var(--blue)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No hay auditorias"
          description="Crea la primera auditoria para comenzar"
        />
      ) : (
        <div className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-base)] bg-[var(--bg-subtle)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Titulo</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Tipo</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Severidad</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Auditado</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Estado</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Fecha limite</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-base)]">
              {filtered.map((audit) => (
                <tr key={audit.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/audits/${audit.id}`} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--blue)]">
                      {audit.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLES[audit.type]}`}>
                      {TYPE_LABELS[audit.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[audit.severity]}`}>
                      {SEVERITY_LABELS[audit.severity]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{audit.audited}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[audit.status]}`}>
                      {STATUS_LABELS[audit.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {audit.deadline ? formatDate(audit.deadline) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/audits/${audit.id}`}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--blue)] transition-colors"
                      >
                        <Eye size={16} strokeWidth={1.5} />
                      </Link>
                      <button
                        onClick={() => handleDelete(audit.id)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                Nueva auditoria
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Titulo *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Auditoria de procesos Q1"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as AuditType }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  >
                    <option value="equipo">Equipo</option>
                    <option value="cliente">Cliente</option>
                    <option value="proceso">Proceso</option>
                    <option value="financiero">Financiero</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Severidad *</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value as Severity }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  >
                    <option value="critico">Critico</option>
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="bajo">Bajo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Auditado *</label>
                <input
                  required
                  value={form.audited}
                  onChange={(e) => setForm((p) => ({ ...p, audited: e.target.value }))}
                  placeholder="Persona, departamento o proceso auditado"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Descripcion</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripcion de la auditoria..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] resize-none"
                />
              </div>

              {/* Hallazgos */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Hallazgos</label>
                {form.findings.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {form.findings.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-subtle)] p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{f.titulo}</p>
                          {f.detalle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{f.detalle}</p>}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${SEVERITY_STYLES[f.severidad]}`}>
                          {SEVERITY_LABELS[f.severidad]}
                        </span>
                        <button type="button" onClick={() => removeFinding(i)} className="p-1 text-[var(--text-muted)] hover:text-red-500 flex-shrink-0">
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 rounded-lg border border-dashed border-[var(--border-base)] p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={newFinding.titulo}
                      onChange={(e) => setNewFinding((p) => ({ ...p, titulo: e.target.value }))}
                      placeholder="Titulo del hallazgo"
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none"
                    />
                    <select
                      value={newFinding.severidad}
                      onChange={(e) => setNewFinding((p) => ({ ...p, severidad: e.target.value as Severity }))}
                      className="rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none"
                    >
                      <option value="critico">Critico</option>
                      <option value="alto">Alto</option>
                      <option value="medio">Medio</option>
                      <option value="bajo">Bajo</option>
                    </select>
                  </div>
                  <input
                    value={newFinding.detalle}
                    onChange={(e) => setNewFinding((p) => ({ ...p, detalle: e.target.value }))}
                    placeholder="Detalle (opcional)"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFinding}
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--blue)] hover:opacity-80 transition-colors"
                  >
                    <Plus size={14} strokeWidth={1.5} /> Agregar hallazgo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Plan de accion</label>
                <textarea
                  rows={3}
                  value={form.action_plan}
                  onChange={(e) => setForm((p) => ({ ...p, action_plan: e.target.value }))}
                  placeholder="Plan de accion para resolver los hallazgos..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Fecha limite</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close className="rounded-lg border border-[var(--border-base)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">
                  Cancelar
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creando...' : 'Crear auditoria'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
