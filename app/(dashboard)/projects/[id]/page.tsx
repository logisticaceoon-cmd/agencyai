'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Tabs from '@radix-ui/react-tabs'
import { cn, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  CheckSquare,
  Calendar,
  FileText,
  Info,
  Loader2,
  FolderKanban,
  Clock,
  Upload,
  Target,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Send,
  Zap,
} from 'lucide-react'
import ProjectPhases from '@/components/shared/ProjectPhases'

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  assignedTo: string[]
  progressPercent: number
  createdAt: string
  updatedAt: string
}

interface ProjectDetail {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  client: { id: string; name: string } | null
  manager: { id: string; fullName: string } | null
  tasks: TaskItem[]
  totalTasks: number
  completedTasks: number
  progressPercent: number
}

interface Milestone {
  id: string
  project_id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  position: number
  created_at: string
}

interface Observation {
  id: string
  milestone_id: string
  content: string
  created_by: string | null
  created_at: string
}

// ── Status/Priority helpers ──────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  onboarding: 'Planificacion',
  active: 'Activo',
  review: 'Revision',
  paused: 'Pausado',
  completed: 'Completado',
}

const statusColor: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  paused: 'bg-slate-50 text-slate-600 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const taskStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  review: 'Revision',
  completed: 'Completada',
  rejected: 'Rechazada',
}

const taskStatusColor: Record<string, string> = {
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const priorityLabel: Record<string, string> = {
  critical: 'Critica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const priorityColor: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-green-50 text-green-700 border-green-200',
}

// ── Info form schema ─────────────────────────────────────────────────────────

const infoSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  status: z
    .enum(['onboarding', 'active', 'review', 'paused', 'completed'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

type InfoFormData = z.infer<typeof infoSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDaysRemaining(endDate: string | null): string {
  if (!endDate) return '--'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(endDate)
  d.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d vencido`
  if (diff === 0) return 'Hoy'
  return `${diff}d restantes`
}

function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  return d < now
}

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  const diff = Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Milestones state
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' })
  const [creatingMilestone, setCreatingMilestone] = useState(false)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [observations, setObservations] = useState<Record<string, Observation[]>>({})
  const [observationText, setObservationText] = useState<Record<string, string>>({})
  const [sendingObservation, setSendingObservation] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<InfoFormData>({
    resolver: zodResolver(infoSchema),
  })

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const json = await res.json()
        setProject(json.data)
      } else {
        router.push('/projects')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, router])

  const loadMilestones = useCallback(async () => {
    setMilestonesLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`)
      if (res.ok) {
        const json = await res.json()
        setMilestones(json.data || [])
      }
    } finally {
      setMilestonesLoading(false)
    }
  }, [projectId])

  const loadObservations = useCallback(async (milestoneId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}/observations`)
      if (res.ok) {
        const json = await res.json()
        setObservations(prev => ({ ...prev, [milestoneId]: json.data || [] }))
      }
    } catch {
      // ignore
    }
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  useEffect(() => {
    if (project) {
      loadMilestones()
    }
  }, [project, loadMilestones])

  // Populate info form when project loads
  useEffect(() => {
    if (project) {
      resetForm({
        name: project.name,
        description: project.description || '',
        status: (project.status as InfoFormData['status']) || 'active',
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      })
    }
  }, [project, resetForm])

  async function onSaveInfo(data: InfoFormData) {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
        }),
      })
      if (res.ok) {
        loadProject()
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleMilestone(milestone: Milestone) {
    const newCompleted = !milestone.completed
    // Optimistic update
    setMilestones(prev =>
      prev.map(m =>
        m.id === milestone.id
          ? { ...m, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : m
      )
    )

    try {
      await fetch(`/api/projects/${projectId}/milestones/${milestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        }),
      })
    } catch {
      // Revert on error
      setMilestones(prev =>
        prev.map(m => (m.id === milestone.id ? milestone : m))
      )
    }
  }

  async function createMilestone() {
    if (!milestoneForm.title.trim()) return
    setCreatingMilestone(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneForm),
      })
      if (res.ok) {
        setShowMilestoneModal(false)
        setMilestoneForm({ title: '', description: '', due_date: '' })
        loadMilestones()
      }
    } finally {
      setCreatingMilestone(false)
    }
  }

  async function sendObservation(milestoneId: string) {
    const text = observationText[milestoneId]?.trim()
    if (!text) return
    setSendingObservation(milestoneId)
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        setObservationText(prev => ({ ...prev, [milestoneId]: '' }))
        loadObservations(milestoneId)
      }
    } finally {
      setSendingObservation(null)
    }
  }

  function handleExpandMilestone(milestoneId: string) {
    if (expandedMilestone === milestoneId) {
      setExpandedMilestone(null)
    } else {
      setExpandedMilestone(milestoneId)
      if (!observations[milestoneId]) {
        loadObservations(milestoneId)
      }
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="h-8 w-2/3 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FolderKanban className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-slate-500">Proyecto no encontrado</p>
        <Link
          href="/projects"
          className="mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          Volver a proyectos
        </Link>
      </div>
    )
  }

  // ── Gantt chart data ───────────────────────────────────────────────────

  const tasksWithDates = project.tasks.filter((t) => t.deadline)
  const ganttTasks = tasksWithDates.map((t) => {
    const start = new Date(t.createdAt)
    const end = t.deadline ? new Date(t.deadline) : new Date()
    return { ...t, start, end }
  })

  let ganttStart = new Date()
  let ganttEnd = new Date()
  if (ganttTasks.length > 0) {
    ganttStart = new Date(Math.min(...ganttTasks.map((t) => t.start.getTime())))
    ganttEnd = new Date(Math.max(...ganttTasks.map((t) => t.end.getTime())))
  }
  ganttStart.setDate(ganttStart.getDate() - ganttStart.getDay())
  ganttEnd.setDate(ganttEnd.getDate() + (6 - ganttEnd.getDay()) + 7)

  const totalGanttDays = Math.max(
    Math.ceil((ganttEnd.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)),
    7
  )
  const totalWeeks = Math.ceil(totalGanttDays / 7)

  const weekHeaders: string[] = []
  for (let i = 0; i < totalWeeks; i++) {
    const d = new Date(ganttStart)
    d.setDate(d.getDate() + i * 7)
    weekHeaders.push(`${d.getDate()}/${d.getMonth() + 1}`)
  }

  // ── Milestone progress ─────────────────────────────────────────────────
  const completedMilestones = milestones.filter(m => m.completed).length
  const totalMilestones = milestones.length
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Proyectos
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">
                {project.name}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  statusColor[project.status] || statusColor.active
                )}
              >
                {statusLabel[project.status] || project.status}
              </span>
            </div>
            {project.client && (
              <p className="text-sm text-slate-500">
                Cliente:{' '}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {project.client.name}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-6">
            {/* Circular progress */}
            <div className="relative flex items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeDasharray={`${project.progressPercent}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-slate-900">
                {project.progressPercent}%
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {project.completedTasks}/{project.totalTasks} tareas
              </p>
              <p className="text-xs text-slate-500">
                {getDaysRemaining(project.endDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs.Root defaultValue="phases">
        <Tabs.List className="flex border-b border-slate-200 mb-5 overflow-x-auto">
          {[
            { value: 'phases', icon: Zap, label: 'Fases' },
            { value: 'tasks', icon: CheckSquare, label: 'Tareas' },
            { value: 'milestones', icon: Target, label: 'Microobjetivos' },
            { value: 'timeline', icon: Calendar, label: 'Cronograma' },
            { value: 'files', icon: FileText, label: 'Archivos' },
            { value: 'info', icon: Info, label: 'Info' },
          ].map(tab => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors whitespace-nowrap"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ── Phases Tab ──────────────────────────────────────────────── */}
        <Tabs.Content value="phases">
          <ProjectPhases projectId={projectId} />
        </Tabs.Content>

        {/* ── Tasks Tab ──────────────────────────────────────────────── */}
        <Tabs.Content value="tasks">
          {project.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-slate-200 bg-white">
              <CheckSquare className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No hay tareas en este proyecto</p>
              <Link href="/tasks/new" className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                Crear tarea
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {project.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          taskStatusColor[task.status] || taskStatusColor.pending
                        )}
                      >
                        {taskStatusLabel[task.status] || task.status}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          priorityColor[task.priority] || priorityColor.medium
                        )}
                      >
                        {priorityLabel[task.priority] || task.priority}
                      </span>
                    </div>
                  </div>
                  {task.deadline && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{formatDate(task.deadline)}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* ── Milestones Tab ──────────────────────────────────────────── */}
        <Tabs.Content value="milestones">
          <div className="space-y-4">
            {/* Progress bar */}
            {totalMilestones > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    Progreso de microobjetivos
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {completedMilestones}/{totalMilestones} ({milestoneProgress}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${milestoneProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Add milestone button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Agregar microobjetivo
              </button>
            </div>

            {/* Milestones list */}
            {milestonesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            ) : milestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-slate-200 bg-white">
                <Target className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No hay microobjetivos todavia</p>
                <p className="text-xs text-slate-400 mt-1">
                  Agrega microobjetivos para hacer seguimiento del avance del proyecto
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {milestones.map((milestone) => {
                  const overdue = isOverdue(milestone.due_date, milestone.completed)
                  const overdueDays = daysOverdue(milestone.due_date)
                  const isExpanded = expandedMilestone === milestone.id
                  const milestoneObs = observations[milestone.id] || []

                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        'rounded-xl border bg-white transition-all',
                        milestone.completed
                          ? 'border-green-200 bg-green-50/30'
                          : overdue && overdueDays >= 2
                          ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/30'
                          : overdue
                          ? 'border-l-4 border-l-red-500 border-slate-200'
                          : 'border-slate-200'
                      )}
                    >
                      <div className="flex items-start gap-3 p-4">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleMilestone(milestone)}
                          className={cn(
                            'mt-0.5 flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors',
                            milestone.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-300 hover:border-blue-500'
                          )}
                        >
                          {milestone.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExpandMilestone(milestone.id)}
                              className={cn(
                                'text-sm font-medium text-left transition-colors',
                                milestone.completed
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-800 hover:text-blue-600'
                              )}
                            >
                              {milestone.title}
                            </button>
                            {overdue && !milestone.completed && (
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            {milestone.completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>

                          {milestone.description && (
                            <p className={cn(
                              'text-xs mt-1',
                              milestone.completed ? 'text-slate-300 line-through' : 'text-slate-500'
                            )}>
                              {milestone.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            {milestone.due_date && (
                              <span className={cn(
                                'text-xs font-medium',
                                milestone.completed
                                  ? 'text-green-600'
                                  : overdue
                                  ? 'text-red-600'
                                  : 'text-slate-500'
                              )}>
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatDate(milestone.due_date)}
                                {overdue && !milestone.completed && ` (${overdueDays}d vencido)`}
                              </span>
                            )}
                            <button
                              onClick={() => handleExpandMilestone(milestone.id)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Notas
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded observations section */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Observaciones
                          </h4>

                          {/* Observation list */}
                          {milestoneObs.length > 0 ? (
                            <div className="space-y-2 mb-3">
                              {milestoneObs.map(obs => (
                                <div key={obs.id} className="rounded-lg bg-white border border-slate-200 p-3">
                                  <p className="text-sm text-slate-700">{obs.content}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] font-medium text-slate-400">
                                      {obs.created_by || 'Sistema'}
                                    </span>
                                    <span className="text-[10px] text-slate-300">
                                      {formatDate(obs.created_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 mb-3">Sin observaciones todavia</p>
                          )}

                          {/* Add observation */}
                          <div className="flex gap-2">
                            <textarea
                              value={observationText[milestone.id] || ''}
                              onChange={e =>
                                setObservationText(prev => ({ ...prev, [milestone.id]: e.target.value }))
                              }
                              placeholder="Escribe una nota..."
                              rows={2}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                            <button
                              onClick={() => sendObservation(milestone.id)}
                              disabled={sendingObservation === milestone.id || !observationText[milestone.id]?.trim()}
                              className="self-end flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {sendingObservation === milestone.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Agregar nota
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Create Milestone Modal ─────────────────────────────────── */}
          {showMilestoneModal && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setShowMilestoneModal(false)}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-slate-900">
                      Nuevo microobjetivo
                    </h3>
                    <button
                      onClick={() => setShowMilestoneModal(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Titulo <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={milestoneForm.title}
                        onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Ej: Entregar primera version del landing"
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Descripcion
                      </label>
                      <textarea
                        value={milestoneForm.description}
                        onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Detalles opcionales..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fecha limite
                      </label>
                      <input
                        type="date"
                        value={milestoneForm.due_date}
                        onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setShowMilestoneModal(false)}
                        className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={createMilestone}
                        disabled={creatingMilestone || !milestoneForm.title.trim()}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {creatingMilestone && <Loader2 className="h-4 w-4 animate-spin" />}
                        Crear microobjetivo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Tabs.Content>

        {/* ── Timeline/Gantt Tab ──────────────────────────────────────── */}
        <Tabs.Content value="timeline">
          {ganttTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-slate-200 bg-white">
              <Calendar className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                No hay tareas con fechas para mostrar en el cronograma
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="sticky left-0 bg-white z-10 text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-48 min-w-[192px]">
                      Tarea
                    </th>
                    {weekHeaders.map((wh, i) => (
                      <th
                        key={i}
                        className="text-center px-1 py-2.5 text-[10px] font-medium text-slate-400"
                        style={{ minWidth: '60px' }}
                      >
                        {wh}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ganttTasks.map((task) => {
                    const taskStartOffset = Math.max(
                      0,
                      Math.floor(
                        (task.start.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)
                      )
                    )
                    const taskDuration = Math.max(
                      1,
                      Math.ceil(
                        (task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)
                      )
                    )
                    const leftPercent = (taskStartOffset / totalGanttDays) * 100
                    const widthPercent = (taskDuration / totalGanttDays) * 100

                    const barColor =
                      task.status === 'completed'
                        ? 'bg-green-400'
                        : task.status === 'in_progress'
                        ? 'bg-blue-500'
                        : task.status === 'review'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'

                    return (
                      <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="sticky left-0 bg-white z-10 px-4 py-2.5">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-xs font-medium text-slate-700 hover:text-blue-600 truncate block max-w-[180px]"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td colSpan={totalWeeks} className="relative h-8">
                          <div className="absolute inset-0 flex items-center px-1">
                            <div
                              className={cn('h-5 rounded-full', barColor)}
                              style={{
                                marginLeft: `${leftPercent}%`,
                                width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                                minWidth: '8px',
                              }}
                              title={`${task.title}: ${formatDate(task.createdAt)} - ${task.deadline ? formatDate(task.deadline) : '--'}`}
                            />
                          </div>
                          <div className="absolute inset-0 flex pointer-events-none">
                            {weekHeaders.map((_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-100" />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="text-[10px] text-slate-400">Pendiente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-slate-400">En progreso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-slate-400">Revision</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-slate-400">Completada</span>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* ── Files Tab ──────────────────────────────────────────────── */}
        <Tabs.Content value="files">
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-slate-300 bg-white">
            <Upload className="h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-base font-medium text-slate-600">Sin archivos</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-sm">
              Los archivos del proyecto apareceran aqui. Esta funcionalidad estara disponible proximamente.
            </p>
          </div>
        </Tabs.Content>

        {/* ── Info Tab ───────────────────────────────────────────────── */}
        <Tabs.Content value="info">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5">
              Informacion del proyecto
            </h2>
            <form onSubmit={handleSubmit(onSaveInfo)} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select
                  {...register('status')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="onboarding">Planificacion</option>
                  <option value="active">Activo</option>
                  <option value="review">Revision</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Completado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha vencimiento</label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {project.client && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <p className="text-sm text-slate-600 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    {project.client.name}
                  </p>
                </div>
              )}

              {project.manager && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                  <p className="text-sm text-slate-600 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    {project.manager?.fullName || 'Sin asignar'}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
