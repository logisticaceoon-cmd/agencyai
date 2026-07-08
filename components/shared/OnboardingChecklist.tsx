'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import {
  Rocket,
  CheckCircle,
  Circle,
  ArrowRight,
  Users,
  FolderKanban,
  UserPlus,
  CreditCard,
  FileText,
  Database,
  Loader2,
  X,
} from 'lucide-react'

interface OnboardingStep {
  id: string
  label: string
  icon: React.ElementType
  href: string
  completed: boolean
}

interface OnboardingChecklistProps {
  workspaceId: string
  hasSampleData?: boolean
}

export function OnboardingChecklist({ workspaceId, hasSampleData }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const fetchProgress = useCallback(async () => {
    try {
      const [clientsRes, projectsRes, membersRes, reportsRes] = await Promise.all([
        fetch('/api/clients?limit=1'),
        fetch('/api/projects?limit=1'),
        fetch('/api/members?limit=100'),
        fetch('/api/reports?limit=1'),
      ])

      const clientsData = clientsRes.ok ? await clientsRes.json() : { data: [] }
      const projectsData = projectsRes.ok ? await projectsRes.json() : { data: [] }
      const membersData = membersRes.ok ? await membersRes.json() : { data: [] }
      const reportsData = reportsRes.ok ? await reportsRes.json() : { data: [] }

      const clients = Array.isArray(clientsData) ? clientsData : (clientsData.data || [])
      const projects = Array.isArray(projectsData) ? projectsData : (projectsData.data || [])
      const members = Array.isArray(membersData) ? membersData : (membersData.data || membersData.members || [])
      const reports = Array.isArray(reportsData) ? reportsData : (reportsData.data || [])

      const newSteps: OnboardingStep[] = [
        { id: 'client', label: 'Agrega tu primer cliente', icon: Users, href: '/clients', completed: clients.length > 0 },
        { id: 'project', label: 'Crea un proyecto', icon: FolderKanban, href: '/projects', completed: projects.length > 0 },
        { id: 'team', label: 'Invita a tu equipo', icon: UserPlus, href: '/settings/team', completed: members.length > 1 },
        { id: 'billing', label: 'Conecta tu facturacion', icon: CreditCard, href: '/settings/billing', completed: false }, // skip or check plan
        { id: 'report', label: 'Genera tu primer reporte', icon: FileText, href: '/reports', completed: reports.length > 0 },
      ]

      setSteps(newSteps)

      const completedCount = newSteps.filter(s => s.completed).length
      if (completedCount === newSteps.length) {
        setAllDone(true)
        // Celebrar con confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
        // Marcar onboarding como completado
        fetch('/api/workspace/onboarding-completed', { method: 'POST' }).catch(() => {})
        // Auto-dismiss despues de 3 segundos
        setTimeout(() => setDismissed(true), 3000)
      }
    } catch (err) {
      console.error('Error fetching onboarding progress:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  async function handleSeedDemo() {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed-demo', { method: 'POST' })
      if (res.ok) {
        // Recargar pagina para ver los nuevos datos
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al cargar datos de ejemplo')
      }
    } catch {
      alert('Error al cargar datos de ejemplo')
    } finally {
      setSeeding(false)
    }
  }

  if (dismissed || loading) return null

  const completedCount = steps.filter(s => s.completed).length
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <div className="rounded-[var(--radius-lg)] border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-5 relative">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/60 transition-colors"
        aria-label="Cerrar checklist"
      >
        <X size={16} strokeWidth={1.5} />
      </button>

      {allDone ? (
        <div className="text-center py-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3">
            <CheckCircle size={24} strokeWidth={1.5} className="text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Todo listo!</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Has completado todos los pasos iniciales. Tu agencia esta lista.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <Rocket size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Primeros pasos</h2>
              <p className="text-xs text-[var(--text-muted)]">{completedCount} de {steps.length} completados</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-blue-100 mb-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--blue)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all group ${
                  step.completed
                    ? 'bg-green-50/60'
                    : 'hover:bg-white/60'
                }`}
              >
                {step.completed ? (
                  <CheckCircle size={18} strokeWidth={1.5} className="text-green-500 flex-shrink-0" />
                ) : (
                  <Circle size={18} strokeWidth={1.5} className="text-[var(--text-muted)] flex-shrink-0 group-hover:text-[var(--blue)]" />
                )}
                <step.icon size={16} strokeWidth={1.5} className={`flex-shrink-0 ${step.completed ? 'text-green-400' : 'text-[var(--text-muted)]'}`} />
                <span className={`text-sm font-medium flex-1 ${
                  step.completed
                    ? 'text-[var(--text-muted)] line-through'
                    : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                }`}>
                  {step.label}
                </span>
                {!step.completed && (
                  <ArrowRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--blue)] transition-colors" />
                )}
              </Link>
            ))}
          </div>

          {/* Seed demo button */}
          {!hasSampleData && completedCount === 0 && (
            <div className="mt-4 pt-4 border-t border-blue-100">
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--blue)] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#1d4ed8] transition-colors disabled:opacity-60"
              >
                {seeding ? (
                  <>
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                    Cargando datos...
                  </>
                ) : (
                  <>
                    <Database size={16} strokeWidth={1.5} />
                    Cargar datos de ejemplo
                  </>
                )}
              </button>
              <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                Crea clientes, proyectos y tareas de ejemplo para explorar la plataforma
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
