'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Eye, Calendar, User } from 'lucide-react'

type AuditType = 'equipo' | 'cliente' | 'proceso' | 'financiero'
type Severity = 'critico' | 'alto' | 'medio' | 'bajo'
type AuditStatus = 'abierta' | 'en_revision' | 'resuelta' | 'desestimada'

interface Finding {
  titulo: string
  detalle: string
  severidad: Severity
}

interface AuditDetail {
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

const STATUS_STYLES: Record<AuditStatus, string> = {
  abierta: 'bg-blue-50 text-blue-600',
  en_revision: 'bg-amber-50 text-amber-600',
  resuelta: 'bg-emerald-50 text-emerald-600',
  desestimada: 'bg-slate-100 text-slate-500',
}

const STATUS_LABELS: Record<AuditStatus, string> = {
  abierta: 'Abierta',
  en_revision: 'En revision',
  resuelta: 'Resuelta',
  desestimada: 'Desestimada',
}

const TYPE_STYLES: Record<AuditType, string> = {
  equipo: 'bg-indigo-50 text-indigo-600',
  cliente: 'bg-teal-50 text-teal-600',
  proceso: 'bg-purple-50 text-purple-600',
  financiero: 'bg-cyan-50 text-cyan-600',
}

const TYPE_LABELS: Record<AuditType, string> = {
  equipo: 'Equipo',
  cliente: 'Cliente',
  proceso: 'Proceso',
  financiero: 'Financiero',
}

export default function AuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionPlan, setActionPlan] = useState('')
  const [editingPlan, setEditingPlan] = useState(false)

  async function loadAudit() {
    try {
      const res = await fetch(`/api/audits/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setAudit(data.data)
        setActionPlan(data.data?.action_plan || '')
      } else {
        router.push('/audits')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAudit() }, [params.id])

  async function changeStatus(status: AuditStatus) {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { status }
      if (status === 'resuelta') body.resolved_at = new Date().toISOString()
      const res = await fetch(`/api/audits/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: `Estado cambiado a: ${STATUS_LABELS[status]}` })
        loadAudit()
      }
    } finally {
      setSaving(false)
    }
  }

  async function savePlan() {
    setSaving(true)
    try {
      const res = await fetch(`/api/audits/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_plan: actionPlan }),
      })
      if (res.ok) {
        toast({ title: 'Plan de accion guardado' })
        setEditingPlan(false)
        loadAudit()
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }
  if (!audit) return null

  const isActive = audit.status === 'abierta' || audit.status === 'en_revision'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/audits" className="mt-1 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{audit.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLES[audit.type]}`}>
              {TYPE_LABELS[audit.type]}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[audit.severity]}`}>
              {SEVERITY_LABELS[audit.severity]}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[audit.status]}`}>
              {STATUS_LABELS[audit.status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <User size={14} strokeWidth={1.5} /> {audit.audited}
            </span>
            {audit.deadline && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} strokeWidth={1.5} /> Limite: {formatDate(audit.deadline)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={14} strokeWidth={1.5} /> Creada: {formatDate(audit.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {audit.description && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Descripcion</h2>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{audit.description}</p>
        </div>
      )}

      {/* Resolved banner */}
      {audit.status === 'resuelta' && audit.resolved_at && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} strokeWidth={1.5} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-700">Auditoria resuelta</p>
            <p className="text-xs text-emerald-600">Fecha de resolucion: {formatDate(audit.resolved_at)}</p>
          </div>
        </div>
      )}

      {/* Findings */}
      <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Hallazgos ({audit.findings?.length || 0})
        </h2>
        {audit.findings && audit.findings.length > 0 ? (
          <div className="space-y-2">
            {audit.findings.map((finding, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-[var(--border-base)] bg-[var(--bg-subtle)] p-4">
                <AlertTriangle size={16} strokeWidth={1.5} className={`mt-0.5 flex-shrink-0 ${
                  finding.severidad === 'critico' ? 'text-red-500' :
                  finding.severidad === 'alto' ? 'text-orange-500' :
                  finding.severidad === 'medio' ? 'text-amber-500' : 'text-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{finding.titulo}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[finding.severidad]}`}>
                      {SEVERITY_LABELS[finding.severidad]}
                    </span>
                  </div>
                  {finding.detalle && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">{finding.detalle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No hay hallazgos registrados.</p>
        )}
      </div>

      {/* Action Plan */}
      <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Plan de accion</h2>
          {isActive && !editingPlan && (
            <button
              onClick={() => setEditingPlan(true)}
              className="text-xs font-medium text-[var(--blue)] hover:opacity-80 transition-colors"
            >
              Editar
            </button>
          )}
        </div>
        {editingPlan ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="Describe el plan de accion para resolver los hallazgos..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setEditingPlan(false); setActionPlan(audit.action_plan || '') }}
                className="rounded-lg border border-[var(--border-base)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePlan}
                disabled={saving}
                className="rounded-lg bg-[var(--blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {audit.action_plan || <span className="text-[var(--text-muted)]">Sin plan de accion definido.</span>}
          </p>
        )}
      </div>

      {/* Status change buttons */}
      {isActive && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Cambiar estado</h2>
          <div className="flex flex-wrap gap-3">
            {audit.status === 'abierta' && (
              <button
                onClick={() => changeStatus('en_revision')}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                <Eye size={16} strokeWidth={1.5} /> Marcar en revision
              </button>
            )}
            <button
              onClick={() => changeStatus('resuelta')}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 size={16} strokeWidth={1.5} /> Marcar como resuelto
            </button>
            <button
              onClick={() => changeStatus('desestimada')}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              <XCircle size={16} strokeWidth={1.5} /> Desestimar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
