'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  id: string; name: string; status: string; priority: string
  start_date: string | null; due_date: string | null; budget: number; budget_spent: number
}

const STATUS_LABELS: Record<string, string> = { active: 'Activo', completed: 'Completado', paused: 'Pausado', cancelled: 'Cancelado' }
const STATUS_COLORS: Record<string, string> = { active: 'bg-green-50 text-green-700', completed: 'bg-blue-50 text-blue-700', paused: 'bg-amber-50 text-amber-700', cancelled: 'bg-red-50 text-red-700' }

export default function PortalProjectsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/${token}/projects`).then(r => r.json()).then(j => setProjects(j.data || [])).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href={`/portal/${token}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6"><ArrowLeft className="h-4 w-4" /> Volver al portal</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Proyectos</h1>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">No hay proyectos</div>
        ) : (
          <div className="grid gap-4">
            {projects.map(p => {
              const progress = p.budget > 0 ? Math.round((p.budget_spent / p.budget) * 100) : 0
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status] || p.status}</span>
                  </div>
                  {p.due_date && <p className="text-xs text-slate-500 mb-3">Fecha estimada: {new Date(p.due_date).toLocaleDateString('es-ES')}</p>}
                  {p.budget > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progreso</span><span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
