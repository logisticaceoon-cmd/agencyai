'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DeadlineCountdown } from '@/components/shared/DeadlineCountdown'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Globe, Mail, Phone, DollarSign } from 'lucide-react'

interface ClientDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  contactPerson: string | null
  industry: string | null
  website: string | null
  notes: string | null
  status: string
  monthlyBudget: string | null
  contractStart: string | null
  contractEnd: string | null
  accountManager: { id: string; fullName: string } | null
  tasks: Array<{ id: string; title: string; status: string; priority: string; deadline: string | null; createdBy: { fullName: string } }>
  reports: Array<{ id: string; title: string; status: string; reportType: string; createdAt: string; submittedBy: { fullName: string } }>
  audits: Array<{ id: string; title: string; status: string; overallStatus: string | null; complianceScore: number | null; executedAt: string | null }>
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tasks' | 'reports' | 'audits'>('tasks')

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
  }, [params.id])

  if (loading) return <div className="max-w-5xl mx-auto space-y-4"><CardSkeleton /><CardSkeleton /></div>
  if (!client) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            {client.industry && <p className="text-sm text-zinc-400">{client.industry}</p>}
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Información</h2>
            {client.contactPerson && (
              <div><p className="text-xs text-zinc-500">Contacto</p><p className="text-sm text-white">{client.contactPerson}</p></div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-500" />
                <a href={`mailto:${client.email}`} className="text-sm text-indigo-400 hover:text-indigo-300">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">{client.phone}</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-zinc-500" />
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300">{client.website}</a>
              </div>
            )}
            {client.monthlyBudget && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-white">${Number(client.monthlyBudget).toLocaleString()}/mes</span>
              </div>
            )}
            {(client.contractStart || client.contractEnd) && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Contrato</p>
                <p className="text-sm text-zinc-300">
                  {client.contractStart && formatDate(client.contractStart)}
                  {client.contractStart && client.contractEnd && ' → '}
                  {client.contractEnd && formatDate(client.contractEnd)}
                </p>
              </div>
            )}
            {client.accountManager && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Account Manager</p>
                <p className="text-sm text-white">{client.accountManager.fullName}</p>
              </div>
            )}
          </div>

          {client.notes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notas internas</h2>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex border-b border-zinc-800">
            {(['tasks', 'reports', 'audits'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {t === 'tasks' ? `Tareas (${client.tasks.length})` : t === 'reports' ? `Reportes (${client.reports.length})` : `Auditorías (${client.audits.length})`}
              </button>
            ))}
          </div>

          {tab === 'tasks' && (
            <div className="space-y-2">
              {client.tasks.length === 0 ? <p className="text-sm text-zinc-500 py-8 text-center">No hay tareas para este cliente</p> : client.tasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">por {task.createdBy.fullName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    <DeadlineCountdown deadline={task.deadline} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-2">
              {client.reports.length === 0 ? <p className="text-sm text-zinc-500 py-8 text-center">No hay reportes para este cliente</p> : client.reports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{report.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">por {report.submittedBy.fullName} · {formatDateTime(report.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={report.reportType} />
                    <StatusBadge status={report.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === 'audits' && (
            <div className="space-y-2">
              {client.audits.length === 0 ? <p className="text-sm text-zinc-500 py-8 text-center">No hay auditorías para este cliente</p> : client.audits.map((audit) => (
                <Link key={audit.id} href={`/audits/${audit.id}`} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{audit.title}</p>
                    {audit.executedAt && <p className="text-xs text-zinc-500 mt-0.5">{formatDateTime(audit.executedAt)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {audit.overallStatus && <StatusBadge status={audit.overallStatus} />}
                    {audit.complianceScore !== null && <span className="text-sm font-bold text-white">{audit.complianceScore}%</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
