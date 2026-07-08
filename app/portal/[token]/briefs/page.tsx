'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Loader2,
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Paperclip,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Brief {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  status: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; class: string }> = {
  pending: { label: 'Pendiente', icon: Clock, class: 'bg-amber-50 text-amber-700' },
  in_review: { label: 'En revision', icon: AlertCircle, class: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Aceptado', icon: CheckCircle, class: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rechazado', icon: AlertCircle, class: 'bg-red-50 text-red-700' },
}

export default function PortalBriefsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [portalData, setPortalData] = useState<{ accentColor: string; agencyName: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.json()),
      fetch(`/api/portal/${token}/briefs`).then(r => r.json()),
    ]).then(([portalRes, briefsRes]) => {
      if (portalRes.data) {
        setPortalData({
          accentColor: portalRes.data.workspaces?.primary_color || '#2563eb',
          agencyName: portalRes.data.workspaces?.name || 'Agencia',
          logoUrl: portalRes.data.workspaces?.logo_url || null,
        })
      }
      setBriefs(briefsRes.data || [])
    }).finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    try {
      let fileUrl = null
      let fileType = null
      let fileSize = null

      // Upload file if present
      if (file) {
        setUploadingFile(true)
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadData.url) {
          fileUrl = uploadData.url
          fileType = file.type
          fileSize = file.size
        }
        setUploadingFile(false)
      }

      const res = await fetch(`/api/portal/${token}/briefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, file_url: fileUrl, file_type: fileType, file_size: fileSize }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setBriefs(prev => [data, ...prev])
        setTitle('')
        setDescription('')
        setFile(null)
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
      setUploadingFile(false)
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
              <Link href={`/portal/${token}/deliverables`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Entregables</Link>
              <Link href={`/portal/${token}/briefs`} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: accentColor, backgroundColor: `${accentColor}10` }}>Briefs</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/portal/${token}`} className="inline-flex items-center gap-2 text-sm hover:opacity-80 mb-6" style={{ color: accentColor }}>
          <ArrowLeft className="h-4 w-4" /> Volver al portal
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <Upload className="h-5 w-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Briefs</h1>
              <p className="text-sm text-slate-500">Envia documentos y referencias para tus proyectos</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="h-4 w-4" />
              Nuevo Brief
            </button>
          )}
        </div>

        {/* Upload Form */}
        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Nuevo Brief</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titulo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Brief para campana de redes sociales"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe lo que necesitas..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 resize-none h-28"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Archivo adjunto</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <Paperclip className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Haz clic para seleccionar un archivo</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOC, imágenes, etc.</p>
                  </button>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadingFile ? 'Subiendo archivo...' : 'Enviando...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Enviar Brief
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setFile(null) }}
                  className="text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Briefs List */}
        {briefs.length === 0 && !showForm ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Upload className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">Aun no has enviado ningun brief</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="h-4 w-4" />
              Crear tu primer brief
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map(brief => {
              const statusConf = STATUS_CONFIG[brief.status] || STATUS_CONFIG.pending
              const StatusIcon = statusConf.icon

              return (
                <div key={brief.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{brief.title}</p>
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', statusConf.class)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConf.label}
                        </span>
                      </div>
                      {brief.description && (
                        <p className="text-sm text-slate-500 mb-2 line-clamp-2">{brief.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{new Date(brief.created_at).toLocaleDateString('es-ES')}</span>
                        {brief.file_url && (
                          <a
                            href={brief.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:opacity-80"
                            style={{ color: accentColor }}
                          >
                            <Paperclip className="h-3 w-3" />
                            Archivo adjunto
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
