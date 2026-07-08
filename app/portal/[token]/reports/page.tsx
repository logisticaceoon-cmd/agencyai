'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
} from 'lucide-react'

interface Report {
  id: string
  title: string
  type: string
  status: string
  period_start: string
  period_end: string
  created_at: string
}

interface Comment {
  id: string
  content: string
  author_name: string
  is_client_comment: boolean
  created_at: string
}

export default function PortalReportsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [loadingComments, setLoadingComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [portalData, setPortalData] = useState<{ accentColor: string; agencyName: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.json()),
      fetch(`/api/portal/${token}/reports`).then(r => r.json()),
    ]).then(([portalRes, reportsRes]) => {
      if (portalRes.data) {
        setPortalData({
          accentColor: portalRes.data.workspaces?.primary_color || '#2563eb',
          agencyName: portalRes.data.workspaces?.name || 'Agencia',
          logoUrl: portalRes.data.workspaces?.logo_url || null,
        })
      }
      setReports(reportsRes.data || [])
    }).finally(() => setLoading(false))

    // Log activity
    fetch(`/api/portal/${token}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'viewed_reports', entity_type: 'report' }),
    }).catch(() => {})
  }, [token])

  const loadComments = async (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null)
      return
    }
    setExpandedReportId(reportId)
    if (!comments[reportId]) {
      setLoadingComments(reportId)
      try {
        const res = await fetch(`/api/portal/${token}/comments?report_id=${reportId}`)
        const data = await res.json()
        setComments(prev => ({ ...prev, [reportId]: data.data || [] }))
      } finally {
        setLoadingComments(null)
      }
    }
  }

  const handleSendComment = async (reportId: string) => {
    if (!newComment.trim()) return
    setSendingComment(true)
    try {
      const res = await fetch(`/api/portal/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, content: newComment }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setComments(prev => ({
          ...prev,
          [reportId]: [...(prev[reportId] || []), data],
        }))
        setNewComment('')
      }
    } finally {
      setSendingComment(false)
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
              <Link href={`/portal/${token}/reports`} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: accentColor, backgroundColor: `${accentColor}10` }}>Reportes</Link>
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
            <FileText className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
            <p className="text-sm text-slate-500">Revisa los reportes de tu cuenta y deja comentarios</p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay reportes disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => {
              const isExpanded = expandedReportId === r.id
              const reportComments = comments[r.id] || []

              return (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {/* Report header */}
                  <div className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="text-xs text-slate-400">
                        {r.period_start && r.period_end
                          ? `${new Date(r.period_start).toLocaleDateString('es-ES')} - ${new Date(r.period_end).toLocaleDateString('es-ES')}`
                          : new Date(r.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => loadComments(r.id)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Comentarios
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Comments section */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {loadingComments === r.id ? (
                        <div className="p-6 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                      ) : (
                        <>
                          {/* Comments list */}
                          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                            {reportComments.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">
                                No hay comentarios aun. Se el primero en comentar.
                              </p>
                            ) : (
                              reportComments.map(comment => (
                                <div
                                  key={comment.id}
                                  className={`flex gap-3 ${comment.is_client_comment ? 'flex-row-reverse' : ''}`}
                                >
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    comment.is_client_comment ? 'bg-slate-200' : ''
                                  }`} style={!comment.is_client_comment ? { backgroundColor: `${accentColor}20` } : {}}>
                                    {comment.is_client_comment ? (
                                      <User className="h-3.5 w-3.5 text-slate-500" />
                                    ) : (
                                      <Building2 className="h-3.5 w-3.5" style={{ color: accentColor }} />
                                    )}
                                  </div>
                                  <div className={`flex-1 max-w-[80%] ${comment.is_client_comment ? 'text-right' : ''}`}>
                                    <div className={`inline-block rounded-lg p-3 text-left ${
                                      comment.is_client_comment
                                        ? 'bg-white border border-slate-200'
                                        : 'bg-white border border-slate-200'
                                    }`}>
                                      <p className="text-xs font-medium text-slate-600 mb-1">
                                        {comment.author_name || (comment.is_client_comment ? 'Tu' : portalData?.agencyName || 'Agencia')}
                                      </p>
                                      <p className="text-sm text-slate-700">{comment.content}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {new Date(comment.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Comment input */}
                          <div className="p-4 border-t border-slate-100">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Escribe un comentario..."
                                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 bg-white"
                                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendComment(r.id)
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleSendComment(r.id)}
                                disabled={sendingComment || !newComment.trim()}
                                className="h-9 w-9 rounded-lg flex items-center justify-center text-white disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: accentColor }}
                              >
                                {sendingComment ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </>
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
