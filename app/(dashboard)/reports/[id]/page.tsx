'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { formatDateTime, timeAgo } from '@/lib/utils'
import { ArrowLeft, Paperclip, MessageSquare, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface ReportDetail {
  id: string
  title: string
  description: string
  reportType: string
  status: string
  priority: string
  fileUrls: string[]
  tags: string[]
  createdAt: string
  validationComments: string | null
  validatedAt: string | null
  submittedBy: { id: string; fullName: string; avatarUrl: string | null; department: string | null }
  client: { id: string; name: string } | null
  task: { id: string; title: string } | null
  validatedBy: { id: string; fullName: string } | null
  comments: Array<{
    id: string; text: string; createdAt: string
    author: { id: string; fullName: string; avatarUrl: string | null }
  }>
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [validationComment, setValidationComment] = useState('')
  const [validating, setValidating] = useState(false)
  const [showValidationInput, setShowValidationInput] = useState(false)
  const [pendingAction, setPendingAction] = useState<'validated' | 'rejected' | 'review' | null>(null)

  async function loadReport() {
    try {
      const res = await fetch(`/api/reports/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data.data)
      } else {
        router.push('/reports')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [params.id])

  async function submitComment() {
    if (!comment.trim()) return
    const res = await fetch(`/api/reports/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment }),
    })
    if (res?.ok) {
      setComment('')
      loadReport()
    }
  }

  async function validate(action: 'validated' | 'rejected' | 'review') {
    setValidating(true)
    try {
      const res = await fetch(`/api/reports/${params.id}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, validationComments: validationComment }),
      })
      if (res.ok) {
        toast({ title: action === 'validated' ? 'Reporte validado ✅' : action === 'rejected' ? 'Reporte rechazado' : 'Enviado a revisión' })
        setShowValidationInput(false)
        setValidationComment('')
        setPendingAction(null)
        loadReport()
      }
    } finally {
      setValidating(false)
    }
  }

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  if (loading) return <div className="max-w-4xl mx-auto space-y-4"><CardSkeleton /><CardSkeleton /></div>
  if (!report) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-white">{report.title}</h1>
          <StatusBadge status={report.reportType} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Descripción</h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{report.description}</p>
          </div>

          {report.fileUrls.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Archivos adjuntos ({report.fileUrls.length})
              </h2>
              <div className="space-y-2">
                {report.fileUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-indigo-400 hover:bg-zinc-700 transition-colors"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="flex-1 truncate">{url.split('/').pop()}</span>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {isCEO && report.status === 'pending' && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Validación</h2>
              {!showValidationInput ? (
                <div className="flex gap-2">
                  <button onClick={() => { setPendingAction('validated'); setShowValidationInput(true) }} className="flex items-center gap-2 rounded-lg bg-green-600/10 border border-green-500/30 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-600/20 transition-colors">
                    <CheckCircle className="h-4 w-4" /> Validar
                  </button>
                  <button onClick={() => { setPendingAction('review'); setShowValidationInput(true) }} className="flex items-center gap-2 rounded-lg bg-yellow-600/10 border border-yellow-500/30 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-600/20 transition-colors">
                    <AlertCircle className="h-4 w-4" /> Revisar
                  </button>
                  <button onClick={() => { setPendingAction('rejected'); setShowValidationInput(true) }} className="flex items-center gap-2 rounded-lg bg-red-600/10 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/20 transition-colors">
                    <XCircle className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea rows={3} value={validationComment} onChange={(e) => setValidationComment(e.target.value)} placeholder="Comentarios de validación (opcional)..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => pendingAction && validate(pendingAction)} disabled={validating} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${pendingAction === 'validated' ? 'bg-green-600 hover:bg-green-500' : pendingAction === 'rejected' ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
                      {pendingAction === 'validated' ? 'Confirmar validación' : pendingAction === 'rejected' ? 'Confirmar rechazo' : 'Confirmar revisión'}
                    </button>
                    <button onClick={() => { setShowValidationInput(false); setPendingAction(null) }} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {report.validatedBy && (
            <div className={`rounded-xl border p-4 ${report.status === 'validated' ? 'border-green-500/30 bg-green-500/5' : report.status === 'rejected' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
              <p className="text-sm font-medium text-zinc-300">
                {report.status === 'validated' ? '✅' : report.status === 'rejected' ? '❌' : '⚠️'} {report.status === 'validated' ? 'Validado' : report.status === 'rejected' ? 'Rechazado' : 'En revisión'} por {report.validatedBy?.fullName || 'Usuario'}
                {report.validatedAt && ` — ${formatDateTime(report.validatedAt)}`}
              </p>
              {report.validationComments && <p className="text-sm text-zinc-400 mt-1">{report.validationComments}</p>}
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Comentarios ({report.comments.length})
            </h2>
            <div className="space-y-3 mb-4">
              {report.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author?.fullName || 'Usuario'} avatarUrl={c.author?.avatarUrl} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{c.author?.fullName || 'Usuario'}</span>
                      <span className="text-xs text-zinc-500">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitComment()} placeholder="Escribí un comentario..." className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
              <button onClick={submitComment} disabled={!comment.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">Enviar</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Enviado por</p>
              <div className="flex items-center gap-2">
                <Avatar name={report.submittedBy?.fullName || 'Usuario'} avatarUrl={report.submittedBy?.avatarUrl} size="sm" />
                <div>
                  <p className="text-sm text-white">{report.submittedBy?.fullName || 'Usuario'}</p>
                  {report.submittedBy.department && <p className="text-xs text-zinc-500">{report.submittedBy.department}</p>}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Fecha</p>
              <p className="text-sm text-zinc-300">{formatDateTime(report.createdAt)}</p>
            </div>
            {report.client && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Cliente</p>
                <Link href={`/clients/${report.client.id}`} className="text-sm text-indigo-400 hover:text-indigo-300">{report.client.name}</Link>
              </div>
            )}
            {report.task && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Tarea relacionada</p>
                <Link href={`/tasks/${report.task.id}`} className="text-sm text-indigo-400 hover:text-indigo-300">{report.task.title}</Link>
              </div>
            )}
            {report.tags.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {report.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
