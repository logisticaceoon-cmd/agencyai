'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ComplianceBadge } from '@/components/shared/ComplianceBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'
import { Search, Plus } from 'lucide-react'

interface Audit {
  id: string
  title: string
  processName: string
  auditedUsers: string[]
  status: string
  overallStatus: string | null
  complianceScore: number | null
  auditFrom: string
  auditTo: string
  createdAt: string
  createdBy: { id: string; fullName: string }
  client: { id: string; name: string } | null
}

export default function AuditsPage() {
  const { user } = useCurrentUser()
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  useEffect(() => {
    async function load() {
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
    load()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditorías"
        description="Control de procesos y compliance"
        action={
          isCEO ? (
            <Link href="/audits/new" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              <Plus className="h-4 w-4" /> Nueva auditoría
            </Link>
          ) : null
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : audits.length === 0 ? (
        <EmptyState icon={Search} title="No hay auditorías" description="Creá la primera auditoría de proceso" />
      ) : (
        <div className="rounded-xl border border-[var(--border-base)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-base)] bg-slate-50">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Auditoría</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Período</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Estado</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Score</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 uppercase tracking-wider">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-slate-100 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/audits/${audit.id}`} className="font-medium text-white hover:text-indigo-300">
                      {audit.title}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)]">{audit.processName}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {formatDate(audit.auditFrom)} → {formatDate(audit.auditTo)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={audit.status} /></td>
                  <td className="px-4 py-3">
                    {audit.complianceScore !== null ? (
                      <ComplianceBadge score={audit.complianceScore} />
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {audit.overallStatus ? <StatusBadge status={audit.overallStatus} /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
