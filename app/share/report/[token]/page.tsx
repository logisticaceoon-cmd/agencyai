'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Calendar, Building2 } from 'lucide-react'

interface SharedReport {
  title: string
  description: string
  type: string
  status: string
  content: string
  created_at: string
  organization: string
}

export default function SharedReportPage() {
  const params = useParams()
  const token = params.token as string
  const [report, setReport] = useState<SharedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/report/${token}`)
        if (res.ok) {
          setReport(await res.json())
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    if (token) load()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Reporte no encontrado</h1>
          <p className="text-sm text-slate-500">El enlace puede haber expirado o ser invalido.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Building2 className="h-4 w-4" />
            <span>{report.organization}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{report.title}</h1>
          {report.description && (
            <p className="text-slate-600 mb-4">{report.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(report.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {report.type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {report.content}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-slate-400">
          Generado con AgencyAI
        </div>
      </div>
    </div>
  )
}
