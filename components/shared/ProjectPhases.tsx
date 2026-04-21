'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDate } from '@/lib/utils'
import {
  Plus,
  X,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

export interface Phase {
  id: string
  title: string
  description: string | null
  deadline: string | null
  responsible_id: string | null
  status: 'pending' | 'in_progress' | 'completed'
  order: number
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  name: string
  email: string
}

interface ProjectPhasesProps {
  projectId: string
  teamMembers?: TeamMember[]
}

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
}

const statusColor: Record<string, string> = {
  pending: 'bg-slate-50 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
}

function getDaysRemaining(deadline: string | null): string {
  if (!deadline) return '--'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d vencido`
  if (diff === 0) return 'Hoy'
  return `${diff}d`
}

function isOverdue(deadline: string | null, completed: boolean): boolean {
  if (!deadline || completed) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  return d < now
}

function isUrgent(deadline: string | null, completed: boolean): boolean {
  if (!deadline || completed) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff <= 3 && diff > 0
}

export default function ProjectPhases({ projectId, teamMembers = [] }: ProjectPhasesProps) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '', deadline: '', responsible_id: '', status: 'pending' })
  const [submitting, setSubmitting] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)

  const loadPhases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/phases`)
      if (res.ok) {
        const json = await res.json()
        setPhases(json.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadPhases()
  }, [loadPhases])

  function openCreateModal() {
    setEditingPhase(null)
    setFormData({ title: '', description: '', deadline: '', responsible_id: '', status: 'pending' })
    setShowModal(true)
  }

  function openEditModal(phase: Phase) {
    setEditingPhase(phase)
    setFormData({
      title: phase.title,
      description: phase.description || '',
      deadline: phase.deadline?.slice(0, 10) || '',
      responsible_id: phase.responsible_id || '',
      status: phase.status,
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) return

    setSubmitting(true)
    try {
      const method = editingPhase ? 'PATCH' : 'POST'
      const url = editingPhase
        ? `/api/projects/${projectId}/phases/${editingPhase.id}`
        : `/api/projects/${projectId}/phases`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          deadline: formData.deadline || null,
          responsible_id: formData.responsible_id || null,
          status: formData.status,
        }),
      })

      if (res.ok) {
        setShowModal(false)
        loadPhases()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function deletePhase(phaseId: string) {
    if (!confirm('¿Eliminar esta fase?')) return

    try {
      const res = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        loadPhases()
      }
    } catch (err) {
      console.error('Error deleting phase:', err)
    }
  }

  async function togglePhaseStatus(phase: Phase) {
    const newStatus = phase.status === 'completed' ? 'pending' : 'completed'
    try {
      const res = await fetch(`/api/projects/${projectId}/phases/${phase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        loadPhases()
      }
    } catch (err) {
      console.error('Error updating phase:', err)
    }
  }

  const completedCount = phases.filter(p => p.status === 'completed').length
  const totalCount = phases.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Progreso de fases
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {completedCount}/{totalCount} ({progress}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Add phase button */}
      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar fase
        </button>
      </div>

      {/* Phases list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
      ) : phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-slate-200 bg-white">
          <div className="mb-3 rounded-full bg-slate-100 p-3">
            <Clock className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No hay fases en este proyecto</p>
          <p className="text-xs text-slate-400 mt-1">
            Agrega fases para organizar el trabajo en bloques
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {phases.map((phase) => {
            const isExpanded = expandedPhase === phase.id
            const overdue = isOverdue(phase.deadline, phase.status === 'completed')
            const urgent = isUrgent(phase.deadline, phase.status === 'completed')
            const responsibleMember = teamMembers.find(m => m.id === phase.responsible_id)

            return (
              <div
                key={phase.id}
                className={cn(
                  'rounded-xl border bg-white transition-all',
                  phase.status === 'completed'
                    ? 'border-green-200 bg-green-50/30'
                    : overdue
                    ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/30'
                    : urgent
                    ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/30'
                    : 'border-slate-200'
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Status checkbox */}
                  <button
                    onClick={() => togglePhaseStatus(phase)}
                    className={cn(
                      'mt-0.5 flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors',
                      phase.status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-slate-300 hover:border-blue-500'
                    )}
                  >
                    {phase.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn(
                        'text-sm font-medium',
                        phase.status === 'completed'
                          ? 'text-slate-400 line-through'
                          : 'text-slate-800'
                      )}>
                        {phase.title}
                      </h3>
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        statusColor[phase.status] || statusColor.pending
                      )}>
                        {statusLabel[phase.status]}
                      </span>
                      {overdue && phase.status !== 'completed' && (
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      {urgent && phase.status !== 'completed' && !overdue && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      )}
                    </div>

                    {phase.description && (
                      <p className={cn(
                        'text-xs mt-1',
                        phase.status === 'completed' ? 'text-slate-300 line-through' : 'text-slate-500'
                      )}>
                        {phase.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {phase.deadline && (
                        <span className={cn(
                          'text-xs font-medium flex items-center gap-1',
                          phase.status === 'completed'
                            ? 'text-green-600'
                            : overdue
                            ? 'text-red-600'
                            : urgent
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        )}>
                          <Clock className="h-3 w-3" />
                          {formatDate(phase.deadline)}
                          <span className="text-[10px]">({getDaysRemaining(phase.deadline)})</span>
                        </span>
                      )}
                      {responsibleMember && (
                        <span className="text-xs text-slate-500">
                          Responsable: {responsibleMember.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(phase)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title="Editar"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deletePhase(phase.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-slate-900">
                  {editingPhase ? 'Editar fase' : 'Nueva fase'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Titulo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Setup inicial"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descripcion
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="Detalles de la fase..."
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
                    value={formData.deadline}
                    onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Responsable
                  </label>
                  <select
                    value={formData.responsible_id}
                    onChange={e => setFormData(f => ({ ...f, responsible_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completada</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.title.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingPhase ? 'Guardar cambios' : 'Crear fase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
