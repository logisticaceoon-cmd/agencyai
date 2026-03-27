'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'

interface Report { id: string; title: string; type: string; status: string; period_start: string; period_end: string; created_at: string }

export default function PortalReportsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/${token}/reports`).then(r => r.json()).then(j => setReports(j.data || [])).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href={`/portal/${token}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6"><ArrowLeft className="h-4 w-4" /> Volver al portal</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Reportes</h1>
        {reports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">No hay reportes disponibles</div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-400">{r.period_start && r.period_end ? `${new Date(r.period_start).toLocaleDateString('es-ES')} - ${new Date(r.period_end).toLocaleDateString('es-ES')}` : new Date(r.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <button onClick={() => window.print()} className="text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-slate-200">Descargar PDF</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
