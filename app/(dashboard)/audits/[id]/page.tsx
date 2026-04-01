'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ComplianceBadge } from '@/components/shared/ComplianceBadge'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ChecklistItem {
  item: string
  result: 'compliant' | 'partial' | 'non_compliant' | null
  notes: string
}

interface AuditDetail {
  id: string
  title: string
  processName: string
  auditedUsers: string[]
  auditFrom: string
  auditTo: string
  status: string
  overallStatus: string | null
  complianceScore: number | null
  notes: string | null
  correctiveActions: string | null
  findings: { checklist: ChecklistItem[] } | null
  createdBy: { id: string; fullName: string }
  client: { id: string; name: string } | null
}

export default function AuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [notes, setNotes] = useState('')
  const [correctiveActions, setCorrectiveActions] = useState('')

  async function loadAudit() {
    try {
      const res = await fetch(`/api/audits/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setAudit(data.data)
        const items = data.data.findings?.checklist || []
        setChecklist(items)
        setNotes(data.data.notes || '')
        setCorrectiveActions(data.data.correctiveActions || '')
      } else {
        router.push('/audits')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAudit() }, [params.id])

  function setItemResult(index: number, result: ChecklistItem['result']) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, result } : item))
  }

  function setItemNotes(index: number, noteText: string) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, notes: noteText } : item))
  }

  async function saveAudit(close = false) {
    setSaving(true)
    try {
      const res = await fetch(`/api/audits/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: { checklist },
          notes,
          correctiveActions,
          status: close ? 'completed' : 'draft',
        }),
      })
      if (res.ok) {
        toast({ title: close ? 'Auditoría completada' : 'Cambios guardados' })
        loadAudit()
      }
    } finally {
      setSaving(false)
    }
  }

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'
  const totalItems = checklist.length
  const answeredItems = checklist.filter((i) => i.result !== null).length
  const score = totalItems > 0
    ? Math.round(((checklist.filter((i) => i.result === 'compliant').length * 1.0 + checklist.filter((i) => i.result === 'partial').length * 0.5) / totalItems) * 100)
    : 0

  if (loading) return <div className="max-w-4xl mx-auto space-y-4"><CardSkeleton /><CardSkeleton /></div>
  if (!audit) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/audits" className="text-[var(--text-muted)] hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{audit.title}</h1>
            <StatusBadge status={audit.status} />
            {audit.overallStatus && <StatusBadge status={audit.overallStatus} />}
            {audit.complianceScore !== null && <ComplianceBadge score={audit.complianceScore} />}
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {audit.processName} · {formatDate(audit.auditFrom)} — {formatDate(audit.auditTo)}
          </p>
        </div>
      </div>

      {isCEO && audit.status !== 'completed' && checklist.length > 0 && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Score calculado en tiempo real</p>
            <p className="text-xs text-[var(--text-secondary)]">{answeredItems}/{totalItems} ítems respondidos</p>
          </div>
          <div className="text-3xl font-bold text-white">{score}%</div>
        </div>
      )}

      {checklist.length > 0 && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Checklist de verificación</h2>
          {checklist.map((item, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-base)] bg-slate-100 p-4 space-y-3">
              <p className="text-sm font-medium text-white">{item.item}</p>
              {isCEO && audit.status !== 'completed' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setItemResult(i, 'compliant')}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${item.result === 'compliant' ? 'border-green-500 bg-green-600/20 text-green-400' : 'border-[var(--border-base)] text-[var(--text-secondary)] hover:border-green-500/50 hover:text-green-400'}`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> CUMPLE
                  </button>
                  <button
                    onClick={() => setItemResult(i, 'partial')}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${item.result === 'partial' ? 'border-yellow-500 bg-yellow-600/20 text-yellow-400' : 'border-[var(--border-base)] text-[var(--text-secondary)] hover:border-yellow-500/50 hover:text-yellow-400'}`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> PARCIAL
                  </button>
                  <button
                    onClick={() => setItemResult(i, 'non_compliant')}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${item.result === 'non_compliant' ? 'border-red-500 bg-red-600/20 text-red-400' : 'border-[var(--border-base)] text-[var(--text-secondary)] hover:border-red-500/50 hover:text-red-400'}`}
                  >
                    <XCircle className="h-3.5 w-3.5" /> NO CUMPLE
                  </button>
                  <input
                    value={item.notes}
                    onChange={(e) => setItemNotes(i, e.target.value)}
                    placeholder="Notas..."
                    className="flex-1 rounded-lg border border-[var(--border-base)] bg-slate-200 px-3 py-1.5 text-xs text-white placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {item.result && <StatusBadge status={item.result} />}
                  {item.notes && <span className="text-xs text-[var(--text-muted)]">{item.notes}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isCEO && audit.status !== 'completed' && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Notas generales</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-sm text-white placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none resize-none" placeholder="Observaciones generales de la auditoría..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Acciones correctivas</label>
            <textarea rows={3} value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-sm text-white placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none resize-none" placeholder="Acciones requeridas para corregir los hallazgos..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => saveAudit(false)} disabled={saving} className="rounded-lg border border-[var(--border-base)] px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">{saving ? 'Guardando...' : 'Guardar borrador'}</button>
            <button onClick={() => saveAudit(true)} disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">Finalizar auditoría</button>
          </div>
        </div>
      )}

      {audit.status === 'completed' && (audit.notes || audit.correctiveActions) && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5 space-y-4">
          {audit.notes && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Notas</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{audit.notes}</p>
            </div>
          )}
          {audit.correctiveActions && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Acciones correctivas</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{audit.correctiveActions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
