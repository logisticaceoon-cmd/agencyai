'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/utils'
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react'
import { InfoBanner } from '@/components/shared/InfoBanner'

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

const typeLabel: Record<string, string> = {
  task_completion: 'Tarea completada',
  change: 'Cambio',
  issue: 'Issue',
  insight: 'Insight',
  client_update: 'Update cliente',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

const typeColor: Record<string, string> = {
  task_completion: 'bg-blue-50 text-blue-700 border-blue-200',
  change: 'bg-purple-50 text-purple-700 border-purple-200',
  issue: 'bg-red-50 text-red-700 border-red-200',
  insight: 'bg-amber-50 text-amber-700 border-amber-200',
  client_update: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  weekly: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  monthly: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  validated: 'Validado',
  rejected: 'Rechazado',
  review: 'En revision',
  draft: 'Borrador',
  sent: 'Enviado',
}

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  validated: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  review: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-slate-100 text-slate-500 border-slate-200',
  sent: 'bg-green-50 text-green-700 border-green-200',
}

export default function ReportsPage() {
  const { user } = useCurrentUser()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function validateReport(id: string, action: 'validated' | 'rejected' | 'review') {
    const res = await fetch(`/api/reports/${id}/validate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast({
        title:
          action === 'validated'
            ? 'Reporte validado'
            : action === 'rejected'
              ? 'Reporte rechazado'
              : 'Enviado a revision',
      })
      loadReports()
    }
  }

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      (r.submittedBy?.fullName || '').toLowerCase().includes(q) ||
      (r.client?.name || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <InfoBanner id="reports" title="Reportes" description="Crea y gestiona reportes para tus clientes. Genera informes mensuales de rendimiento." />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isCEO ? 'Gestion y validacion de reportes del equipo' : 'Mis reportes enviados'}
          </p>
        </div>
        <Link
          href="/reports/new"
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo reporte
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por titulo, autor o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviado</option>
          <option value="pending">Pendientes</option>
          <option value="validated">Validados</option>
          <option value="rejected">Rechazados</option>
          <option value="review">En revision</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensual</option>
          <option value="task_completion">Tarea completada</option>
          <option value="change">Cambio</option>
          <option value="issue">Issue</option>
          <option value="insight">Insight</option>
          <option value="client_update">Update cliente</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay reportes"
          description="Todavia no hay reportes con estos filtros"
          action={
            <Link
              href="/reports/new"
              className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nuevo reporte
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Titulo</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Autor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                {isCEO && <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/reports/${report.id}`}
                      className="font-medium text-slate-900 hover:text-[#2563eb] transition-colors"
                    >
                      {report.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {report.client?.name || <span className="text-slate-400">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeColor[report.reportType] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    >
                      {typeLabel[report.reportType] || report.reportType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor[report.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}
                    >
                      {statusLabel[report.status] || report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{report.submittedBy?.fullName || 'Sin asignar'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{timeAgo(report.createdAt)}</span>
                    </div>
                  </td>
                  {isCEO && (
                    <td className="px-4 py-3 text-right">
                      {report.status === 'pending' && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => validateReport(report.id, 'validated')}
                            className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Validar
                          </button>
                          <button
                            onClick={() => validateReport(report.id, 'review')}
                            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <AlertCircle className="h-3.5 w-3.5" /> Revisar
                          </button>
                          <button
                            onClick={() => validateReport(report.id, 'rejected')}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
