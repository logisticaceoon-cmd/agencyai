'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Loader2,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Image,
  Film,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Deliverable {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  status: string
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  project_id: string | null
  projects: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  revision_requested: 'Revision solicitada',
  rejected: 'Rechazado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  revision_requested: 'bg-orange-50 text-orange-700 border-orange-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return FileText
  if (fileType.startsWith('image/')) return Image
  if (fileType.startsWith('video/')) return Film
  return FileText
}

export default function PortalDeliverablesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [portalData, setPortalData] = useState<{ accentColor: string; agencyName: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.json()),
      fetch(`/api/portal/${token}/deliverables`).then(r => r.json()),
    ]).then(([portalRes, delRes]) => {
      if (portalRes.data) {
        setPortalData({
          accentColor: portalRes.data.workspaces?.primary_color || '#2563eb',
          agencyName: portalRes.data.workspaces?.name || 'Agencia',
          logoUrl: portalRes.data.workspaces?.logo_url || null,
        })
      }
      setDeliverables(delRes.data || [])
    }).finally(() => setLoading(false))
  }, [token])

  const handleReview = async (id: string, action: 'approved' | 'revision_requested') => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/${token}/deliverables/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: reviewNotes }),
      })
      if (res.ok) {
        setDeliverables(prev =>
          prev.map(d =>
            d.id === id
              ? { ...d, status: action, review_notes: reviewNotes, reviewed_at: new Date().toISOString() }
              : d
          )
        )
        setReviewingId(null)
        setReviewNotes('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const accentColor = portalData?.accentColor || '#2563eb'

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {portalData?.logoUrl ? (
                <img src={portalData.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: accentColor }}>
                  {(portalData?.agencyName || 'A').charAt(0)}
                </div>
              )}
              <p className="text-sm font-bold text-slate-900 hidden sm:block">{portalData?.agencyName}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/portal/${token}`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Inicio</Link>
              <Link href={`/portal/${token}/projects`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Proyectos</Link>
              <Link href={`/portal/${token}/deliverables`} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: accentColor, backgroundColor: `${accentColor}10` }}>Entregables</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/portal/${token}`} className="inline-flex items-center gap-2 text-sm hover:opacity-80 mb-6" style={{ color: accentColor }}>
          <ArrowLeft className="h-4 w-4" /> Volver al portal
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
            <Package className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Entregables</h1>
            <p className="text-sm text-slate-500">Revisa y aprueba los entregables de tus proyectos</p>
          </div>
        </div>

        {deliverables.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay entregables disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverables.map(d => {
              const FileIcon = getFileIcon(d.file_type)
              const isExpanded = expandedId === d.id
              const isReviewing = reviewingId === d.id

              return (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{d.title}</p>
                      <p className="text-xs text-slate-400">
                        {d.projects?.name || 'Sin proyecto'} &middot; {new Date(d.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border', STATUS_COLORS[d.status])}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                      {d.description && (
                        <p className="text-sm text-slate-600 mb-4">{d.description}</p>
                      )}

                      {d.file_url && (
                        <div className="mb-4">
                          {d.file_type?.startsWith('image/') && (
                            <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 max-w-md">
                              <img src={d.file_url} alt={d.title} className="w-full h-auto" />
                            </div>
                          )}
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                            style={{ color: accentColor }}
                          >
                            <Download className="h-4 w-4" />
                            Descargar archivo
                          </a>
                        </div>
                      )}

                      {d.review_notes && d.status !== 'pending' && (
                        <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs font-medium text-slate-500 mb-1">Notas de revision</p>
                          <p className="text-sm text-slate-700">{d.review_notes}</p>
                        </div>
                      )}

                      {/* Review Actions */}
                      {d.status === 'pending' && !isReviewing && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(d.id, 'approved')}
                            disabled={submitting}
                            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Check className="h-4 w-4" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => setReviewingId(d.id)}
                            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Solicitar revision
                          </button>
                        </div>
                      )}

                      {/* Revision notes form */}
                      {isReviewing && (
                        <div className="space-y-3">
                          <textarea
                            value={reviewNotes}
                            onChange={e => setReviewNotes(e.target.value)}
                            placeholder="Describe los cambios que necesitas..."
                            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 resize-none h-24"
                            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(d.id, 'revision_requested')}
                              disabled={submitting || !reviewNotes.trim()}
                              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                              style={{ backgroundColor: accentColor }}
                            >
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                              Enviar solicitud
                            </button>
                            <button
                              onClick={() => { setReviewingId(null); setReviewNotes('') }}
                              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            >
                              <X className="h-4 w-4" />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
