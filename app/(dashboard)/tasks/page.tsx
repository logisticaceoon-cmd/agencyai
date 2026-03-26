'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Avatar } from '@/components/shared/Avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DeadlineCountdown } from '@/components/shared/DeadlineCountdown'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/use-toast'
import { cn, getPriorityColor } from '@/lib/utils'
import { Plus, CheckSquare, Filter, Search } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  assignedTo: string[]
  deadline: string | null
  status: string
  priority: string
  progressPercent: number
  createdBy: { id: string; fullName: string }
  client: { id: string; name: string } | null
  _count: { comments: number; subtasks: number }
}

const priorities = ['critical', 'high', 'medium', 'low']
const statuses = ['pending', 'in_progress', 'completed', 'rejected']

export default function TasksPage() {
  const { user } = useCurrentUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter])

  useEffect(() => { loadTasks() }, [loadTasks])

  const filtered = tasks.filter((t) =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const grouped = {
    critical: filtered.filter((t) => t.priority === 'critical'),
    high: filtered.filter((t) => t.priority === 'high'),
    medium: filtered.filter((t) => t.priority === 'medium'),
    low: filtered.filter((t) => t.priority === 'low'),
  }

  async function updateProgress(taskId: string, value: number) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressPercent: value }),
    })
    if (res.ok) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, progressPercent: value } : t))
    }
  }

  async function markCompleted(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', progressPercent: 100 }),
    })
    if (res.ok) {
      toast({ title: 'Tarea marcada como completada, pendiente de validación' })
      loadTasks()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tareas"
        description={isCEO ? 'Gestión de tareas del equipo' : 'Mis tareas asignadas'}
        action={
          isCEO ? (
            <Link
              href="/tasks/new"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Link>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todas las prioridades</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No hay tareas"
          description={isCEO ? 'Creá la primera tarea para tu equipo' : 'No tenés tareas asignadas'}
          action={
            isCEO ? (
              <Link
                href="/tasks/new"
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4" /> Nueva tarea
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {(priorityFilter ? [priorityFilter] : priorities).map((priority) => {
            const group = grouped[priority as keyof typeof grouped] || filtered.filter((t) => t.priority === priority)
            if (group.length === 0) return null
            const priorityLabels: Record<string, string> = {
              critical: '🔴 CRÍTICO', high: '🟡 ALTO', medium: '🟠 MEDIO', low: '🟢 BAJO'
            }
            return (
              <div key={priority}>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                  {priorityLabels[priority]} ({group.length})
                </h3>
                <div className="space-y-2">
                  {group.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isTeam={!isCEO}
                      currentUserId={user?.id}
                      onUpdateProgress={updateProgress}
                      onMarkCompleted={markCompleted}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, isTeam, currentUserId, onUpdateProgress, onMarkCompleted }: {
  task: Task
  isTeam: boolean
  currentUserId?: string
  onUpdateProgress: (id: string, value: number) => void
  onMarkCompleted: (id: string) => void
}) {
  const isAssigned = currentUserId && task.assignedTo.includes(currentUserId)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/tasks/${task.id}`}
              className="font-medium text-white hover:text-indigo-300 transition-colors truncate"
            >
              {task.title}
            </Link>
            <StatusBadge status={task.status} />
            <StatusBadge status={task.priority} />
          </div>
          {task.client && (
            <p className="text-xs text-zinc-500 mb-2">Cliente: {task.client.name}</p>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <span className="text-xs text-zinc-500 w-8">{task.progressPercent}%</span>
              {isTeam && isAssigned && task.status === 'in_progress' ? (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={task.progressPercent}
                  onChange={(e) => onUpdateProgress(task.id, parseInt(e.target.value))}
                  className="flex-1 h-1.5 rounded-full accent-indigo-500"
                />
              ) : (
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${task.progressPercent}%` }}
                  />
                </div>
              )}
            </div>
            <DeadlineCountdown deadline={task.deadline} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isTeam && isAssigned && task.status !== 'completed' && task.status !== 'rejected' && (
            <button
              onClick={() => onMarkCompleted(task.id)}
              className="rounded-lg bg-green-600/10 border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors"
            >
              Completar
            </button>
          )}
          <Link
            href={`/tasks/${task.id}`}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </div>
  )
}
