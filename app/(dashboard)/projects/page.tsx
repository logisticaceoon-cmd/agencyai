'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Dialog from '@radix-ui/react-dialog'
import { cn, formatDate } from '@/lib/utils'
import {
  FolderKanban,
  Plus,
  X,
  Loader2,
  Calendar,
  Users,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  client: { id: string; name: string } | null
  manager: { id: string; fullName: string } | null
  _count: { tasks: number }
  totalTasks: number
  completedTasks: number
  progressPercent: number
}

interface ClientOption {
  id: string
  name: string
}

// ── Validation ───────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  status: z
    .enum(['onboarding', 'active', 'review', 'paused', 'completed'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  color: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

// ── Status helpers ───────────────────────────────────────────────────────────

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

const PROJECT_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#db2777',
  '#4f46e5',
]

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { user } = useCurrentUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'active',
      color: PROJECT_COLORS[0],
    },
  })

  // ── Data fetching ──────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterClient) params.set('client_id', filterClient)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/projects?${params}`)
      if (res.ok) {
        const json = await res.json()
        setProjects(json.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [filterClient, filterStatus])

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const json = await res.json()
        setClients(
          (json.data || []).map((c: ClientOption) => ({
            id: c.id,
            name: c.name,
          }))
        )
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  // ── Handlers ───────────────────────────────────────────────────────────

  function openCreateDialog() {
    setEditingProject(null)
    reset({
      name: '',
      description: '',
      clientId: '',
      status: 'active',
      startDate: '',
      endDate: '',
      color: PROJECT_COLORS[0],
    })
    setDialogOpen(true)
  }

  function openEditDialog(project: Project) {
    setEditingProject(project)
    reset({
      name: project.name,
      description: project.description || '',
      clientId: project.client?.id || '',
      status:
        (project.status as ProjectFormData['status']) || 'active',
      startDate: project.startDate
        ? project.startDate.slice(0, 10)
        : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      color: PROJECT_COLORS[0],
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: ProjectFormData) {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        clientId: data.clientId || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      }

      if (editingProject) {
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          loadProjects()
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          loadProjects()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestion de proyectos de la agencia
          </p>
        </div>
        <button
          onClick={openCreateDialog}
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="onboarding">Planificacion</option>
          <option value="active">Activo</option>
          <option value="review">Revision</option>
          <option value="paused">Pausado</option>
          <option value="completed">Completado</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="h-5 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
              <div className="h-2 w-full rounded-full bg-slate-200" />
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-slate-200" />
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <FolderKanban className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">
            No hay proyectos
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Crea tu primer proyecto para empezar a organizar el trabajo
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
            >
              {/* Project name & edit */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {project.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openEditDialog(project)
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>

              {/* Client badge */}
              {project.client && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {project.client.name}
                  </span>
                </div>
              )}

              {/* Status badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statusColor[project.status] || statusColor.active
                  )}
                >
                  {statusLabel[project.status] || project.status}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Progreso</span>
                  <span className="text-xs font-medium text-slate-700">
                    {project.progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      project.progressPercent >= 100
                        ? 'bg-green-500'
                        : project.progressPercent >= 50
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    )}
                    style={{ width: `${project.progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {project.completedTasks} de {project.totalTasks} tareas
                </p>
              </div>

              {/* Due date */}
              {project.endDate && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Vence: {formatDate(project.endDate)}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre del proyecto"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripcion
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Descripcion del proyecto..."
                />
              </div>

              {/* Cliente & Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente
                  </label>
                  <select
                    {...register('clientId')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Sin cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado
                  </label>
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
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha vencimiento
                  </label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Color
                </label>
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={cn(
                            'h-8 w-8 rounded-full border-2 transition-all',
                            field.value === color
                              ? 'border-slate-900 scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingProject
                    ? 'Guardar cambios'
                    : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
