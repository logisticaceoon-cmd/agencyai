'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, FolderKanban, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  status: string
  priority: string
  start_date: string | null
  due_date: string | null
  budget: number
  budget_spent: number
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export default function PortalProjectsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [portalData, setPortalData] = useState<{ accentColor: string; agencyName: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.json()),
      fetch(`/api/portal/${token}/projects`).then(r => r.json()),
    ]).then(([portalRes, projectsRes]) => {
      if (portalRes.data) {
        setPortalData({
          accentColor: portalRes.data.workspaces?.primary_color || '#2563eb',
          agencyName: portalRes.data.workspaces?.name || 'Agencia',
          logoUrl: portalRes.data.workspaces?.logo_url || null,
        })
      }
      setProjects(projectsRes.data || [])
    }).finally(() => setLoading(false))

    // Log activity
    fetch(`/api/portal/${token}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'viewed_projects', entity_type: 'project' }),
    }).catch(() => {})
  }, [token])

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
              <Link href={`/portal/${token}/projects`} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: accentColor, backgroundColor: `${accentColor}10` }}>Proyectos</Link>
              <Link href={`/portal/${token}/reports`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Reportes</Link>
              <Link href={`/portal/${token}/deliverables`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Entregables</Link>
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
            <FolderKanban className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Proyectos</h1>
            <p className="text-sm text-slate-500">Estado de tus proyectos en curso</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay proyectos</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(p => {
              const progress = p.budget > 0 ? Math.round((p.budget_spent / p.budget) * 100) : 0
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                    <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border', STATUS_COLORS[p.status])}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  {p.due_date && (
                    <p className="text-xs text-slate-500 mb-3">
                      Fecha estimada: {new Date(p.due_date).toLocaleDateString('es-ES')}
                    </p>
                  )}
                  {p.budget > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progreso</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: accentColor }}
                        />
                      </div>
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
