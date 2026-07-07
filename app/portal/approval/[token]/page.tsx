'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, RotateCcw, Clock, Zap, Loader2 } from 'lucide-react'

interface ApprovalData {
  id: string
  title: string
  description: string | null
  attachments: unknown[]
  status: string
  expires_at: string | null
  responded_at: string | null
  client_comment: string | null
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendiente de respuesta', color: 'text-yellow-600', icon: Clock },
  approved: { label: 'Aprobado', color: 'text-green-600', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'text-red-600', icon: XCircle },
  revision_requested: { label: 'Revision solicitada', color: 'text-orange-600', icon: RotateCcw },
}

export default function ApprovalPortalPage() {
  const params = useParams()
  const token = params.token as string

  const [approval, setApproval] = useState<ApprovalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Use the respond endpoint to fetch by looking up via a GET-style approach
        // Since we only have POST respond endpoint, we fetch via a custom approach
        // We'll add a simple fetch that uses the admin client via the token
        const res = await fetch(`/api/portal/approval/${token}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Solicitud no encontrada')
          return
        }
        const data = await res.json()
        setApproval(data.data)
      } catch {
        setError('Error al cargar la solicitud')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleRespond(action: 'approved' | 'rejected' | 'revision_requested') {
    if (!approval) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/approvals/${approval.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, comment: comment.trim() || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setApproval(data.data)
        setSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al enviar respuesta')
      }
    } catch {
      setError('Error de conexion')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error && !approval) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Solicitud no encontrada</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!approval) return null

  const statusInfo = STATUS_DISPLAY[approval.status] || STATUS_DISPLAY.pending
  const StatusIcon = statusInfo.icon
  const isPending = approval.status === 'pending'
  const isExpired = approval.expires_at && new Date(approval.expires_at) < new Date()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-bold text-slate-900">AgencyAI</span>
          <span className="text-xs text-slate-400 ml-2">Solicitud de aprobacion</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Status bar */}
          <div className={`px-6 py-3 flex items-center gap-2 border-b border-slate-100 ${
            approval.status === 'pending' ? 'bg-yellow-50' :
            approval.status === 'approved' ? 'bg-green-50' :
            approval.status === 'rejected' ? 'bg-red-50' : 'bg-orange-50'
          }`}>
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{approval.title}</h1>
              {approval.description && (
                <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{approval.description}</p>
              )}
            </div>

            {/* Attachments */}
            {approval.attachments && approval.attachments.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Archivos adjuntos</h3>
                <div className="space-y-1">
                  {(approval.attachments as { name?: string; url?: string }[]).map((att, i) => (
                    <a
                      key={i}
                      href={att.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 py-1"
                    >
                      {att.name || `Archivo ${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Already responded or expired */}
            {!isPending && approval.client_comment && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Tu comentario</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{approval.client_comment}</p>
              </div>
            )}

            {submitted && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">Respuesta enviada correctamente</p>
                <p className="text-xs text-green-600 mt-1">Gracias por tu respuesta</p>
              </div>
            )}

            {isExpired && isPending && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
                <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-800">Esta solicitud ha expirado</p>
              </div>
            )}

            {/* Response form */}
            {isPending && !isExpired && !submitted && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Comentario (opcional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                    placeholder="Agrega un comentario o feedback..."
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleRespond('approved')}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRespond('revision_requested')}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Solicitar revision
                  </button>
                  <button
                    onClick={() => handleRespond('rejected')}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">
          Powered by AgencyAI
        </p>
      </main>
    </div>
  )
}
