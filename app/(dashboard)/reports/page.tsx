'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/utils'
import { FileText, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Report {
  id: string
  title: string
  description: string
  reportType: string
  status: string
  priority: string
  createdAt: string
  submittedBy: { id: string; fullName: string; avatarUrl: string | null }
  client: { id: string; name: string } | null
  task: { id: string; title: string } | null
}

export default function ReportsPage() {
  const { user } = useCurrentUser()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('reportType', typeFilter)
      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => { loadReports() }, [loadReports])

  async function validateReport(id: string, action: 'validated' | 'rejected' | 'review') {
    const res = await fetch(`/api/reports/${id}/validate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast({ title: action === 'validated' ? 'Reporte validado ✅' : action === 'rejected' ? 'Reporte rechazado' : 'Enviado a revisión' })
      loadReports()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description={isCEO ? 'Gestión y validación de reportes del equipo' : 'Mis reportes enviados'}
        action={
          <Link
            href="/reports/new"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo reporte
          </Link>
        }
      />

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="validated">Validados</option>
          <option value="rejected">Rechazados</option>
          <option value="review">En revisión</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todos los tipos</option>
          <option value="task_completion">Tarea completada</option>
          <option value="change">Cambio</option>
          <option value="issue">Issue</option>
          <option value="insight">Insight</option>
          <option value="client_update">Update cliente</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay reportes"
          description="Todavía no hay reportes con estos filtros"
          action={
            <Link href="/reports/new" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              <Plus className="h-4 w-4" /> Nuevo reporte
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link href={`/reports/${report.id}`} className="font-medium text-white hover:text-indigo-300 transition-colors">
                      {report.title}
                    </Link>
                    <StatusBadge status={report.reportType} />
                    <StatusBadge status={report.status} />
                    {report.priority !== 'medium' && <StatusBadge status={report.priority} />}
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{report.description}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={report.submittedBy.fullName} avatarUrl={report.submittedBy.avatarUrl} size="sm" />
                      <span>{report.submittedBy.fullName}</span>
                    </div>
                    {report.client && <span>· {report.client.name}</span>}
                    <span>· {timeAgo(report.createdAt)}</span>
                  </div>
                </div>

                {isCEO && report.status === 'pending' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => validateReport(report.id, 'validated')}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600/10 border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Validar
                    </button>
                    <button
                      onClick={() => validateReport(report.id, 'review')}
                      className="flex items-center gap-1.5 rounded-lg bg-yellow-600/10 border border-yellow-500/30 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-600/20 transition-colors"
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Revisar
                    </button>
                    <button
                      onClick={() => validateReport(report.id, 'rejected')}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600/10 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/20 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
