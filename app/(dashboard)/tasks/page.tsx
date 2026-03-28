'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn, formatDate } from '@/lib/utils'
import {
  Plus,
  CheckSquare,
  Search,
  List,
  LayoutGrid,
  X,
  Calendar,
  Clock,
  GripVertical,
  Trash2,
  Edit3,
  ChevronRight,
  Check,
} from 'lucide-react'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  description: string | null
  assignedTo: string[]
  deadline: string | null
  status: string
  priority: string
  progressPercent: number
  estimatedHours: number | null
  actualHours: number | null
  taskType: string | null
  projectId: string | null
  clientId: string | null
  checklist: { label: string; done: boolean }[] | null
  parentTaskId: string | null
  createdBy: { id: string; fullName: string; avatarUrl?: string | null }
  client: { id: string; name: string } | null
  project: { id: string; name: string } | null
  _count: { comments: number; subtasks: number }
  subtasks?: Task[]
}

interface Project {
  id: string
  name: string
}

interface Member {
  userId: string
  user: { id: string; fullName: string; avatarUrl?: string | null }
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Por hacer' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'review', label: 'En revision' },
  { key: 'completed', label: 'Completado' },
] as const

type KanbanStatus = (typeof KANBAN_COLUMNS)[number]['key']

const STATUS_LABELS: Record<string, string> = {
  pending: 'Por hacer',
  in_progress: 'En progreso',
  review: 'En revision',
  completed: 'Completado',
  rejected: 'Rechazado',
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-600',
  review: 'bg-amber-50 text-amber-600',
  completed: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-50 text-red-600',
  high: 'bg-orange-50 text-orange-600',
  medium: 'bg-yellow-50 text-yellow-600',
  low: 'bg-green-50 text-green-600',
}

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const taskFormSchema = z.object({
  title: z.string().min(1, 'El titulo es obligatorio'),
  description: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'review', 'completed', 'rejected']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  assignedTo: z.string().optional(),
  deadline: z.string().optional(),
  estimatedHours: z.union([z.number(), z.string()]).optional(),
  tags: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskFormSchema>

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, org } = useCurrentUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [defaultStatus, setDefaultStatus] = useState<string>('pending')

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  // ─── Data fetching ───────────────────────────────────────────────────────────

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

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects?limit=100')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.data || [])
      }
    } catch {}
  }, [])

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.data || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    loadProjects()
    loadMembers()
  }, [loadProjects, loadMembers])

  // ─── Filtered tasks ──────────────────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [tasks, searchQuery]
  )

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function openCreateModal(status?: string) {
    setEditingTask(null)
    setDefaultStatus(status || 'pending')
    setModalOpen(true)
  }

  function openEditModal(task: Task) {
    setEditingTask(task)
    setDefaultStatus(task.status)
    setModalOpen(true)
  }

  async function handleSaveTask(data: TaskFormData) {
    const body = {
      ...data,
      assignedTo: data.assignedTo ? [data.assignedTo] : user ? [user.id] : [],
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : undefined,
    }

    if (editingTask) {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        loadTasks()
        if (detailTask?.id === editingTask.id) {
          loadTaskDetail(editingTask.id)
        }
      }
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        loadTasks()
      }
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        ...(newStatus === 'completed' ? { progressPercent: 100 } : {}),
      }),
    })
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, ...(newStatus === 'completed' ? { progressPercent: 100 } : {}) }
            : t
        )
      )
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Seguro que deseas eliminar esta tarea?')) return
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      if (detailTask?.id === taskId) setDetailTask(null)
    }
  }

  async function loadTaskDetail(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`)
    if (res.ok) {
      const data = await res.json()
      setDetailTask(data.data)
    }
  }

  function getMemberName(userId: string) {
    const m = members.find((m) => m.userId === userId)
    return m?.user?.fullName || 'Sin asignar'
  }

  function getMemberAvatar(userId: string) {
    const m = members.find((m) => m.userId === userId)
    return m?.user?.avatarUrl || null
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isCEO ? 'Gestion de tareas del equipo' : 'Mis tareas asignadas'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {KANBAN_COLUMNS.map((col) => (
            <option key={col.key} value={col.key}>
              {col.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton viewMode={viewMode} />
      ) : filtered.length === 0 && !searchQuery && !statusFilter && !priorityFilter ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckSquare className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No hay tareas</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            {isCEO ? 'Crea la primera tarea para tu equipo' : 'No tienes tareas asignadas'}
          </p>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <ListView
          tasks={filtered}
          getMemberName={getMemberName}
          onRowClick={(task) => loadTaskDetail(task.id)}
          onEdit={openEditModal}
          onDelete={handleDeleteTask}
        />
      ) : (
        <KanbanView
          tasks={filtered}
          getMemberName={getMemberName}
          getMemberAvatar={getMemberAvatar}
          onStatusChange={handleStatusChange}
          onCardClick={(task) => loadTaskDetail(task.id)}
          onAddToColumn={openCreateModal}
        />
      )}

      {/* Create/Edit Modal */}
      <TaskFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
        projects={projects}
        members={members}
        onSubmit={handleSaveTask}
      />

      {/* Detail Slide-in Panel */}
      <TaskDetailPanel
        task={detailTask}
        onClose={() => setDetailTask(null)}
        getMemberName={getMemberName}
        onEdit={openEditModal}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
        onReload={() => detailTask && loadTaskDetail(detailTask.id)}
      />
    </div>
  )
}

// ─── LIST VIEW ─────────────────────────────────────────────────────────────────

function ListView({
  tasks,
  getMemberName,
  onRowClick,
  onEdit,
  onDelete,
}: {
  tasks: Task[]
  getMemberName: (id: string) => string
  onRowClick: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Titulo</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Proyecto</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Prioridad</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Asignado</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Vencimiento</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onRowClick(task)}
            >
              <td className="px-4 py-3 font-medium text-slate-900 max-w-[240px] truncate">
                {task.title}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {task.project?.name || '-'}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    STATUS_BADGE[task.status] || STATUS_BADGE.pending
                  )}
                >
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[task.priority])} />
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {task.assignedTo.length > 0 ? getMemberName(task.assignedTo[0]) : 'Sin asignar'}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {task.deadline ? formatDate(task.deadline) : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEdit(task)}
                    className="rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── KANBAN VIEW ───────────────────────────────────────────────────────────────

function KanbanView({
  tasks,
  getMemberName,
  getMemberAvatar,
  onStatusChange,
  onCardClick,
  onAddToColumn,
}: {
  tasks: Task[]
  getMemberName: (id: string) => string
  getMemberAvatar: (id: string) => string | null
  onStatusChange: (taskId: string, status: string) => void
  onCardClick: (task: Task) => void
  onAddToColumn: (status: string) => void
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const columnTasks = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    for (const col of KANBAN_COLUMNS) {
      grouped[col.key] = tasks.filter((t) => {
        if (col.key === 'review') return t.status === 'review'
        return t.status === col.key
      })
    }
    return grouped
  }, [tasks])

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const overIdStr = over.id as string

    // Determine the target column
    let targetStatus: string | null = null

    // Check if dropped on a column droppable
    const col = KANBAN_COLUMNS.find((c) => c.key === overIdStr)
    if (col) {
      targetStatus = col.key
    } else {
      // Dropped on another task - find which column it belongs to
      const overTask = tasks.find((t) => t.id === overIdStr)
      if (overTask) {
        targetStatus = overTask.status
      }
    }

    if (targetStatus) {
      const task = tasks.find((t) => t.id === taskId)
      if (task && task.status !== targetStatus) {
        onStatusChange(taskId, targetStatus)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            id={col.key}
            label={col.label}
            tasks={columnTasks[col.key] || []}
            getMemberName={getMemberName}
            getMemberAvatar={getMemberAvatar}
            onCardClick={onCardClick}
            onAdd={() => onAddToColumn(col.key)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <KanbanCardOverlay
            task={activeTask}
            getMemberName={getMemberName}
            getMemberAvatar={getMemberAvatar}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  id,
  label,
  tasks,
  getMemberName,
  getMemberAvatar,
  onCardClick,
  onAdd,
}: {
  id: string
  label: string
  tasks: Task[]
  getMemberName: (id: string) => string
  getMemberAvatar: (id: string) => string | null
  onCardClick: (task: Task) => void
  onAdd: () => void
}) {
  const { setNodeRef } = useSortable({
    id,
    data: { type: 'column' },
  })

  const columnHeaderColor: Record<string, string> = {
    pending: 'bg-slate-400',
    in_progress: 'bg-blue-500',
    review: 'bg-amber-500',
    completed: 'bg-green-500',
  }

  return (
    <div ref={setNodeRef} className="flex flex-col rounded-xl bg-slate-50 border border-slate-200">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', columnHeaderColor[id])} />
          <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
          <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-slate-200 px-1.5 text-xs font-medium text-slate-600">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="rounded-md p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              getMemberName={getMemberName}
              getMemberAvatar={getMemberAvatar}
              onClick={() => onCardClick(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            Arrastra tareas aqui
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanCard({
  task,
  getMemberName,
  getMemberAvatar,
  onClick,
}: {
  task: Task
  getMemberName: (id: string) => string
  getMemberAvatar: (id: string) => string | null
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const assigneeName = task.assignedTo.length > 0 ? getMemberName(task.assignedTo[0]) : null
  const assigneeAvatar = task.assignedTo.length > 0 ? getMemberAvatar(task.assignedTo[0]) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[task.priority])} />
          {PRIORITY_LABELS[task.priority]}
        </span>
        <GripVertical className="h-3.5 w-3.5 text-slate-300" />
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">{task.title}</h4>

      {/* Footer: due date + assignee */}
      <div className="flex items-center justify-between mt-2">
        {task.deadline ? (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(task.deadline)}
          </div>
        ) : (
          <span />
        )}
        {assigneeName && (
          <div className="flex items-center gap-1.5" title={assigneeName}>
            {assigneeAvatar ? (
              <img
                src={assigneeAvatar}
                alt={assigneeName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                {assigneeName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanCardOverlay({
  task,
  getMemberName,
  getMemberAvatar,
}: {
  task: Task
  getMemberName: (id: string) => string
  getMemberAvatar: (id: string) => string | null
}) {
  return (
    <div className="rounded-lg border border-blue-300 bg-white p-3 shadow-lg ring-2 ring-blue-200 w-[260px]">
      <div className="flex items-center gap-1 mb-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            PRIORITY_BADGE[task.priority]
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[task.priority])} />
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
      <h4 className="text-sm font-medium text-slate-900 line-clamp-2">{task.title}</h4>
    </div>
  )
}

// ─── TASK FORM MODAL ───────────────────────────────────────────────────────────

function TaskFormModal({
  open,
  onOpenChange,
  task,
  defaultStatus,
  projects,
  members,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  defaultStatus: string
  projects: Project[]
  members: Member[]
  onSubmit: (data: TaskFormData) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
  })

  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title,
          description: task.description || '',
          projectId: task.projectId || '',
          status: task.status as TaskFormData['status'],
          priority: task.priority as TaskFormData['priority'],
          assignedTo: task.assignedTo[0] || '',
          deadline: task.deadline ? task.deadline.slice(0, 10) : '',
          estimatedHours: task.estimatedHours || undefined,
          tags: '',
        })
      } else {
        reset({
          title: '',
          description: '',
          projectId: '',
          status: defaultStatus as TaskFormData['status'],
          priority: 'medium',
          assignedTo: '',
          deadline: '',
          estimatedHours: undefined,
          tags: '',
        })
      }
    }
  }, [open, task, defaultStatus, reset])

  const onFormSubmit: SubmitHandler<TaskFormData> = async (data) => {
    await onSubmit(data)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900 mb-4">
            {task ? 'Editar tarea' : 'Nueva tarea'}
          </Dialog.Title>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Titulo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titulo <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Nombre de la tarea"
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Descripcion */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Describe la tarea..."
              />
            </div>

            {/* Row: Proyecto + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                <select
                  {...register('projectId')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select
                  {...register('status')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  {KANBAN_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Prioridad + Asignado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                <select
                  {...register('priority')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="critical">🔴 Critico</option>
                  <option value="high">🟠 Alto</option>
                  <option value="medium">🟡 Medio</option>
                  <option value="low">🟢 Bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Asignado</label>
                <select
                  {...register('assignedTo')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sin asignar</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.fullName || 'Miembro'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Fecha + Horas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha vencimiento
                </label>
                <input
                  type="date"
                  {...register('deadline')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Horas estimadas
                </label>
                <input
                  type="number"
                  {...register('estimatedHours')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tags (separados por coma)
              </label>
              <input
                {...register('tags')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="diseno, urgente, cliente-x"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── TASK DETAIL SLIDE-IN PANEL ────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  onClose,
  getMemberName,
  onEdit,
  onDelete,
  onStatusChange,
  onReload,
}: {
  task: Task | null
  onClose: () => void
  getMemberName: (id: string) => string
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onReload: () => void
}) {
  const [newSubtask, setNewSubtask] = useState('')
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (task) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [task, onClose])

  async function addSubtask() {
    if (!task || !newSubtask.trim()) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newSubtask.trim(),
        parentTaskId: task.id,
        assignedTo: task.assignedTo,
        priority: task.priority,
      }),
    })
    if (res.ok) {
      setNewSubtask('')
      setShowSubtaskInput(false)
      onReload()
    }
  }

  async function toggleChecklist(index: number) {
    if (!task || !task.checklist) return
    const updatedChecklist = task.checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    )
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: updatedChecklist }),
    })
    onReload()
  }

  return (
    <>
      {/* Backdrop */}
      {task && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 ease-in-out overflow-y-auto',
          task ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {task && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold text-slate-900">{task.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_BADGE[task.status]
                    )}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      PRIORITY_BADGE[task.priority]
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[task.priority])} />
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status quick actions */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                Cambiar estado
              </label>
              <div className="flex flex-wrap gap-2">
                {KANBAN_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => onStatusChange(task.id, col.key)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                      task.status === col.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    )}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                  Descripcion
                </label>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Proyecto"
                value={task.project?.name || 'Sin proyecto'}
              />
              <DetailField
                label="Cliente"
                value={task.client?.name || 'Sin cliente'}
              />
              <DetailField
                label="Asignado"
                value={
                  task.assignedTo.length > 0
                    ? getMemberName(task.assignedTo[0])
                    : 'Sin asignar'
                }
              />
              <DetailField label="Creado por" value={task.createdBy?.fullName || '-'} />
              <DetailField
                label="Vencimiento"
                value={task.deadline ? formatDate(task.deadline) : 'Sin fecha'}
                icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />}
              />
              <DetailField
                label="Horas estimadas"
                value={task.estimatedHours ? `${task.estimatedHours}h` : '-'}
                icon={<Clock className="h-3.5 w-3.5 text-slate-400" />}
              />
              <DetailField
                label="Progreso"
                value={`${task.progressPercent}%`}
              />
              <DetailField
                label="Horas reales"
                value={task.actualHours ? `${task.actualHours}h` : '-'}
              />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Progreso</span>
                <span>{task.progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist */}
            {task.checklist && task.checklist.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                  Checklist
                </label>
                <div className="space-y-1.5">
                  {task.checklist.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => toggleChecklist(i)}
                      className="flex items-center gap-2 w-full text-left text-sm py-1 group"
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center h-4 w-4 rounded border transition-colors',
                          item.done
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 group-hover:border-blue-400'
                        )}
                      >
                        {item.done && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className={cn(
                          'text-slate-700',
                          item.done && 'line-through text-slate-400'
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Subtareas ({task.subtasks?.length || task._count?.subtasks || 0})
                </label>
                <button
                  onClick={() => setShowSubtaskInput(true)}
                  className="rounded-md p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {task.subtasks && task.subtasks.length > 0 && (
                <div className="space-y-1.5">
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center h-4 w-4 rounded border',
                          sub.status === 'completed'
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300'
                        )}
                      >
                        {sub.status === 'completed' && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className={cn(
                          'text-sm flex-1',
                          sub.status === 'completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-700'
                        )}
                      >
                        {sub.title}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_BADGE[sub.status]
                        )}
                      >
                        {STATUS_LABELS[sub.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showSubtaskInput && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSubtask()
                      if (e.key === 'Escape') {
                        setShowSubtaskInput(false)
                        setNewSubtask('')
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="Nombre de la subtarea"
                    autoFocus
                  />
                  <button
                    onClick={addSubtask}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => {
                      setShowSubtaskInput(false)
                      setNewSubtask('')
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => onEdit(task)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function DetailField({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <span className="block text-xs text-slate-500 mb-0.5">{label}</span>
      <span className="flex items-center gap-1 text-sm font-medium text-slate-800">
        {icon}
        {value}
      </span>
    </div>
  )
}

// ─── LOADING SKELETON ──────────────────────────────────────────────────────────

function LoadingSkeleton({ viewMode }: { viewMode: string }) {
  if (viewMode === 'kanban') {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="h-24 rounded-lg bg-white border border-slate-200 animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
          <div className="h-4 flex-1 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}
