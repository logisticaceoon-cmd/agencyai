'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDate } from '@/lib/utils'
import {
  Plus, X, Loader2, Clock, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Edit3, Trash2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

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

interface PhaseTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  deadline: string | null
  parentTaskId: string | null
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const priorityColor: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-500',
  high: 'text-red-500',
}

const priorityLabel: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

function getDaysRemaining(deadline: string | null): string {
  if (!deadline) return '--'
  const now = new Date(); now.setHours(0,0,0,0)
  const d = new Date(deadline); d.setHours(0,0,0,0)
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d vencido`
  if (diff === 0) return 'Hoy'
  return `${diff}d`
}

function isOverdue(deadline: string | null, done: boolean) {
  if (!deadline || done) return false
  const now = new Date(); now.setHours(0,0,0,0)
  const d = new Date(deadline); d.setHours(0,0,0,0)
  return d < now
}

function isUrgent(deadline: string | null, done: boolean) {
  if (!deadline || done) return false
  const now = new Date(); now.setHours(0,0,0,0)
  const d = new Date(deadline); d.setHours(0,0,0,0)
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  return diff <= 3 && diff > 0
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectPhases({ projectId, teamMembers = [] }: ProjectPhasesProps) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [tasks, setTasks] = useState<PhaseTask[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)

  // Phase modal
  const [phaseModal, setPhaseModal] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [phaseForm, setPhaseForm] = useState({ title: '', description: '', deadline: '', responsible_id: '', status: 'pending' })
  const [savingPhase, setSavingPhase] = useState(false)

  // Task modal
  const [taskModal, setTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<PhaseTask | null>(null)
  const [taskPhaseId, setTaskPhaseId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', deadline: '', status: 'pending' })
  const [savingTask, setSavingTask] = useState(false)

  // ── Load data ───────────────────────────────────────────────────────────────

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

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?project_id=${projectId}&limit=500`)
    if (res.ok) {
      const json = await res.json()
      setTasks(json.data || [])
    }
  }, [projectId])

  useEffect(() => {
    loadPhases()
    loadTasks()
  }, [loadPhases, loadTasks])

  function tasksForPhase(phaseId: string) {
    return tasks.filter(t => t.parentTaskId === phaseId)
  }

  // ── Phase CRUD ──────────────────────────────────────────────────────────────

  function openCreatePhase() {
    setEditingPhase(null)
    setPhaseForm({ title: '', description: '', deadline: '', responsible_id: '', status: 'pending' })
    setPhaseModal(true)
  }

  function openEditPhase(phase: Phase) {
    setEditingPhase(phase)
    setPhaseForm({
      title: phase.title,
      description: phase.description || '',
      deadline: phase.deadline?.slice(0, 10) || '',
      responsible_id: phase.responsible_id || '',
      status: phase.status,
    })
    setPhaseModal(true)
  }

  async function savePhase(e: React.FormEvent) {
    e.preventDefault()
    if (!phaseForm.title.trim()) return
    setSavingPhase(true)
    try {
      const method = editingPhase ? 'PATCH' : 'POST'
      const url = editingPhase
        ? `/api/projects/${projectId}/phases/${editingPhase.id}`
        : `/api/projects/${projectId}/phases`
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: phaseForm.title,
          description: phaseForm.description || null,
          deadline: phaseForm.deadline || null,
          responsible_id: phaseForm.responsible_id || null,
          status: phaseForm.status,
        }),
      })
      if (res.ok) { setPhaseModal(false); loadPhases() }
    } finally { setSavingPhase(false) }
  }

  async function deletePhase(phaseId: string) {
    if (!confirm('¿Eliminar esta fase y todas sus tareas?')) return
    const res = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' })
    if (res.ok) { loadPhases(); loadTasks() }
  }

  async function togglePhaseStatus(phase: Phase) {
    const newStatus = phase.status === 'completed' ? 'pending' : 'completed'
    const res = await fetch(`/api/projects/${projectId}/phases/${phase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) loadPhases()
  }

  // ── Task CRUD ───────────────────────────────────────────────────────────────

  function openCreateTask(phaseId: string) {
    setEditingTask(null)
    setTaskPhaseId(phaseId)
    setTaskForm({ title: '', description: '', priority: 'medium', deadline: '', status: 'pending' })
    setTaskModal(true)
  }

  function openEditTask(task: PhaseTask) {
    setEditingTask(task)
    setTaskPhaseId(task.parentTaskId)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      deadline: task.deadline?.slice(0, 10) || '',
      status: task.status || 'pending',
    })
    setTaskModal(true)
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.title.trim()) return
    setSavingTask(true)
    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description || null,
            priority: taskForm.priority,
            deadline: taskForm.deadline || null,
            status: taskForm.status,
          }),
        })
        if (res.ok) { setTaskModal(false); loadTasks() }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description || null,
            projectId,
            parentTaskId: taskPhaseId,
            priority: taskForm.priority,
            deadline: taskForm.deadline || null,
            status: 'pending',
          }),
        })
        if (res.ok) { setTaskModal(false); loadTasks() }
      }
    } finally { setSavingTask(false) }
  }

  async function toggleTaskDone(task: PhaseTask) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) loadTasks()
  }

  async function deleteTask(taskId: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) loadTasks()
  }

  // ── Progress ─────────────────────────────────────────────────────────────────

  const completedPhases = phases.filter(p => p.status === 'completed').length
  const totalPhases = phases.length
  const phaseProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0

  const totalTasks = tasks.filter(t => t.parentTaskId && phases.some(p => p.id === t.parentTaskId)).length
  const doneTasks = tasks.filter(t => t.parentTaskId && phases.some(p => p.id === t.parentTaskId) && t.status === 'completed').length
  const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Progress bars */}
      {totalPhases > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">Fases completadas</span>
              <span className="text-xs font-semibold text-slate-900">{completedPhases}/{totalPhases} ({phaseProgress}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${phaseProgress}%` }} />
            </div>
          </div>
          {totalTasks > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-slate-500">Tareas completadas</span>
                <span className="text-xs font-semibold text-slate-900">{doneTasks}/{totalTasks} ({taskProgress}%)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${taskProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header: add phase */}
      <div className="flex justify-end">
        <button
          onClick={openCreatePhase}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Agregar fase
        </button>
      </div>

      {/* Phases */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
      ) : phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-slate-200 bg-white">
          <div className="mb-3 rounded-full bg-slate-100 p-3">
            <Clock className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No hay fases todavía</p>
          <p className="text-xs text-slate-400 mt-1">Agrega fases para organizar el trabajo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {phases.map((phase) => {
            const isExpanded = expandedPhase === phase.id
            const overdue = isOverdue(phase.deadline, phase.status === 'completed')
            const urgent = isUrgent(phase.deadline, phase.status === 'completed')
            const phaseTasks = tasksForPhase(phase.id)
            const doneCount = phaseTasks.filter(t => t.status === 'completed').length
            const taskCount = phaseTasks.length

            return (
              <div
                key={phase.id}
                className={cn(
                  'rounded-xl border bg-white transition-all',
                  phase.status === 'completed' ? 'border-green-200 bg-green-50/30' :
                  overdue ? 'border-l-4 border-l-red-500 border-red-200' :
                  urgent ? 'border-l-4 border-l-amber-500 border-amber-200' :
                  'border-slate-200'
                )}
              >
                {/* Phase header */}
                <div className="flex items-start gap-3 p-4">
                  {/* Done checkbox */}
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

                  {/* Expand toggle + info */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      }
                      <h3 className={cn(
                        'text-sm font-semibold',
                        phase.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'
                      )}>
                        {phase.title}
                      </h3>
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        statusColor[phase.status] || statusColor.pending
                      )}>
                        {statusLabel[phase.status]}
                      </span>
                      {overdue && phase.status !== 'completed' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {urgent && phase.status !== 'completed' && !overdue && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {taskCount > 0 && (
                        <span className="text-xs text-slate-400 font-medium">{doneCount}/{taskCount} tareas</span>
                      )}
                    </div>
                    {phase.description && (
                      <p className={cn('text-xs mt-1 ml-6', phase.status === 'completed' ? 'text-slate-300' : 'text-slate-500')}>
                        {phase.description}
                      </p>
                    )}
                    {phase.deadline && (
                      <div className="flex items-center gap-1 mt-1.5 ml-6">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className={cn('text-xs font-medium',
                          phase.status === 'completed' ? 'text-green-600' :
                          overdue ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-slate-500'
                        )}>
                          {formatDate(phase.deadline)} · {getDaysRemaining(phase.deadline)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Phase actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditPhase(phase)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title="Editar fase"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deletePhase(phase.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Eliminar fase"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks inside phase (expanded) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                    {phaseTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">Sin tareas — agrega la primera</p>
                    ) : (
                      phaseTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border px-3 py-2.5 bg-white',
                            task.status === 'completed' ? 'border-green-100 bg-green-50/40' : 'border-slate-100 hover:border-slate-200'
                          )}
                        >
                          {/* Task checkbox */}
                          <button
                            onClick={() => toggleTaskDone(task)}
                            className={cn(
                              'mt-0.5 flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                              task.status === 'completed'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-slate-300 hover:border-blue-500'
                            )}
                          >
                            {task.status === 'completed' && (
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 12 12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>

                          {/* Task content */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm',
                              task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'
                            )}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn('text-xs font-medium', priorityColor[task.priority] || 'text-slate-400')}>
                                {priorityLabel[task.priority] || task.priority}
                              </span>
                              {task.deadline && (
                                <span className={cn('text-xs', isOverdue(task.deadline, task.status === 'completed') ? 'text-red-500' : 'text-slate-400')}>
                                  · {formatDate(task.deadline)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Task actions */}
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEditTask(task)}
                              className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Add task button */}
                    <button
                      onClick={() => openCreateTask(phase.id)}
                      className="flex items-center gap-2 w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nueva tarea en esta fase
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── PHASE MODAL ──────────────────────────────────────────────────────── */}
      {phaseModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setPhaseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-slate-900">
                  {editingPhase ? 'Editar fase' : 'Nueva fase'}
                </h3>
                <button onClick={() => setPhaseModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <form onSubmit={savePhase} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                  <input
                    type="text" required
                    value={phaseForm.title}
                    onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Módulos Core"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={phaseForm.description}
                    onChange={e => setPhaseForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha límite</label>
                    <input
                      type="date"
                      value={phaseForm.deadline}
                      onChange={e => setPhaseForm(f => ({ ...f, deadline: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select
                      value={phaseForm.status}
                      onChange={e => setPhaseForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En progreso</option>
                      <option value="completed">Completada</option>
                    </select>
                  </div>
                </div>
                {teamMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                    <select
                      value={phaseForm.responsible_id}
                      onChange={e => setPhaseForm(f => ({ ...f, responsible_id: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setPhaseModal(false)} className="rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
                    Cancelar
                  </button>
                  <button
                    type="submit" disabled={savingPhase || !phaseForm.title.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingPhase && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingPhase ? 'Guardar cambios' : 'Crear fase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── TASK MODAL ───────────────────────────────────────────────────────── */}
      {taskModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setTaskModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-slate-900">
                  {editingTask ? 'Editar tarea' : 'Nueva tarea'}
                </h3>
                <button onClick={() => setTaskModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <form onSubmit={saveTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                  <input
                    type="text" required
                    value={taskForm.title}
                    onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Implementar CRUD de clientes"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={taskForm.description}
                    onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                    <select
                      value={taskForm.priority}
                      onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select
                      value={taskForm.status}
                      onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En progreso</option>
                      <option value="completed">Completada</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha límite</label>
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setTaskModal(false)} className="rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
                    Cancelar
                  </button>
                  <button
                    type="submit" disabled={savingTask || !taskForm.title.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingTask && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingTask ? 'Guardar cambios' : 'Crear tarea'}
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
