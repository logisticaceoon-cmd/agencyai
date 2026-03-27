'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Target,
  Plus,
  X,
  Loader2,
  ExternalLink,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarTask {
  id: string
  title: string
  deadline: string
  status: string
  priority: string
  description?: string | null
  client?: { id: string; name: string } | null
  project?: { id: string; name: string } | null
}

interface CalendarMilestone {
  id: string
  title: string
  due_date: string
  completed: boolean
  description?: string | null
  project_id: string
  project_name?: string
}

interface DayEvent {
  id: string
  type: 'task' | 'milestone'
  title: string
  date: string
  status?: string
  priority?: string
  description?: string | null
  client?: string
  projectId?: string
  projectName?: string
  completed?: boolean
}

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

export default function CalendarPage() {
  const { org } = useAuthStore()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<DayEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Slide-in panel for event detail
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<DayEvent | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)

  // Create task modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDate, setCreateDate] = useState<string>('')
  const [createForm, setCreateForm] = useState({ title: '', description: '', projectId: '' })
  const [creating, setCreating] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const monthStr = format(currentMonth, 'yyyy-MM')
      const res = await fetch(`/api/calendar?month=${monthStr}`)
      const data = await res.json()

      const mapped: DayEvent[] = [
        ...(data.tasks || []).map((t: CalendarTask) => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          date: t.deadline,
          status: t.status,
          priority: t.priority,
          description: t.description || null,
          client: t.client?.name,
          projectId: t.project?.id,
          projectName: t.project?.name,
        })),
        ...(data.milestones || []).map((m: CalendarMilestone) => ({
          id: m.id,
          type: 'milestone' as const,
          title: m.title,
          date: m.due_date,
          description: m.description || null,
          completed: m.completed,
          projectId: m.project_id,
          projectName: m.project_name,
        })),
      ]
      setEvents(mapped)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    if (org) {
      fetchEvents()
      fetch('/api/projects')
        .then(r => r.json())
        .then(j => setProjects((j.data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
        .catch(() => {})
    }
  }, [org, fetchEvents])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date): DayEvent[] => {
    return events.filter((e) => {
      try {
        const eventDate = parseISO(e.date)
        return isSameDay(eventDate, day)
      } catch {
        return false
      }
    })
  }

  function handleChipClick(event: DayEvent) {
    setSelectedEvent(event)
    setPanelOpen(true)
  }

  function handleEmptyDayClick(day: Date) {
    const dayEvents = getEventsForDay(day)
    if (dayEvents.length === 0) {
      setCreateDate(format(day, 'yyyy-MM-dd'))
      setCreateForm({ title: '', description: '', projectId: '' })
      setCreateModalOpen(true)
    }
  }

  async function handleMarkComplete() {
    if (!selectedEvent) return
    setMarkingComplete(true)
    try {
      if (selectedEvent.type === 'task') {
        await fetch(`/api/tasks/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
      } else if (selectedEvent.type === 'milestone' && selectedEvent.projectId) {
        await fetch(`/api/projects/${selectedEvent.projectId}/milestones/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true, completed_at: new Date().toISOString() }),
        })
      }
      setPanelOpen(false)
      setSelectedEvent(null)
      fetchEvents()
    } finally {
      setMarkingComplete(false)
    }
  }

  async function handleCreateTask() {
    if (!createForm.title.trim()) return
    setCreating(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || undefined,
          deadline: createDate,
          projectId: createForm.projectId || undefined,
          assignedTo: [],
          priority: 'medium',
        }),
      })
      setCreateModalOpen(false)
      fetchEvents()
    } finally {
      setCreating(false)
    }
  }

  function truncate(str: string, len: number) {
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualiza tareas y microobjetivos del mes
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Calendar Grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                const dayEvents = getEventsForDay(day)
                const taskEvents = dayEvents.filter(e => e.type === 'task')
                const milestoneEvents = dayEvents.filter(e => e.type === 'milestone')
                const hasEvents = dayEvents.length > 0

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => !hasEvents && handleEmptyDayClick(day)}
                    className={cn(
                      'relative flex flex-col p-2 text-sm border-b border-r border-slate-200 transition-all',
                      'min-h-[100px]',
                      inMonth ? 'bg-white' : 'bg-slate-50/50',
                      today && 'border-2 border-blue-500 bg-blue-50/30',
                      !hasEvents && inMonth && 'cursor-pointer hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium mb-1',
                        !inMonth && 'text-slate-300',
                        today && 'text-blue-600 font-bold',
                        inMonth && !today && 'text-slate-700'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                      {/* Task chips - show first 2 */}
                      {taskEvents.slice(0, 2).map(evt => (
                        <button
                          key={evt.id}
                          onClick={(e) => { e.stopPropagation(); handleChipClick(evt) }}
                          className="text-left truncate text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          {truncate(evt.title, 15)}
                        </button>
                      ))}

                      {/* Milestone chips - show first 2 */}
                      {milestoneEvents.slice(0, 2).map(evt => (
                        <button
                          key={evt.id}
                          onClick={(e) => { e.stopPropagation(); handleChipClick(evt) }}
                          className="text-left truncate text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                        >
                          {truncate(evt.title, 15)}
                        </button>
                      ))}

                      {/* "+N mas" indicator */}
                      {dayEvents.length > 4 && (
                        <span className="text-[10px] text-slate-400 font-medium px-1.5">
                          +{dayEvents.length - 4} mas
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Tareas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Microobjetivos
            </div>
          </div>
        </div>

        {/* ── Slide-in Event Detail Panel ─────────────────────────────── */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 transition-transform duration-300 ease-in-out',
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                {selectedEvent?.type === 'task' ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Target className="h-5 w-5 text-green-600" />
                )}
                <span className="text-xs font-medium text-slate-400 uppercase">
                  {selectedEvent?.type === 'task' ? 'Tarea' : 'Microobjetivo'}
                </span>
              </div>
              <button
                onClick={() => { setPanelOpen(false); setSelectedEvent(null) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Panel Content */}
            {selectedEvent && (
              <div className="flex-1 overflow-y-auto p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {selectedEvent.title}
                </h3>

                {selectedEvent.description && (
                  <p className="text-sm text-slate-600 mb-4">{selectedEvent.description}</p>
                )}

                <div className="space-y-3 mb-6">
                  {selectedEvent.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Estado</span>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        selectedEvent.status === 'completed' ? 'bg-green-100 text-green-700'
                          : selectedEvent.status === 'in_progress' ? 'bg-blue-100 text-blue-700'
                          : selectedEvent.status === 'pending' ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      )}>
                        {selectedEvent.status === 'completed' ? 'Completada'
                          : selectedEvent.status === 'in_progress' ? 'En progreso'
                          : selectedEvent.status === 'pending' ? 'Pendiente'
                          : selectedEvent.status}
                      </span>
                    </div>
                  )}

                  {selectedEvent.completed !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Estado</span>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        selectedEvent.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {selectedEvent.completed ? 'Completado' : 'Pendiente'}
                      </span>
                    </div>
                  )}

                  {selectedEvent.client && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Cliente</span>
                      <span className="text-xs font-medium text-slate-700">{selectedEvent.client}</span>
                    </div>
                  )}

                  {selectedEvent.projectName && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Proyecto</span>
                      <span className="text-xs font-medium text-slate-700">{selectedEvent.projectName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Fecha</span>
                    <span className="text-xs font-medium text-slate-700">
                      {format(parseISO(selectedEvent.date), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* Mark complete button */}
                  {((selectedEvent.type === 'task' && selectedEvent.status !== 'completed') ||
                    (selectedEvent.type === 'milestone' && !selectedEvent.completed)) && (
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {markingComplete ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Marcar como completado
                    </button>
                  )}

                  {/* View detail link */}
                  <button
                    onClick={() => {
                      if (selectedEvent.type === 'task') {
                        router.push(`/tasks/${selectedEvent.id}`)
                      } else if (selectedEvent.projectId) {
                        router.push(`/projects/${selectedEvent.projectId}`)
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver detalle
                  </button>
                </div>
              </div>
            )}

            {/* Panel Summary */}
            {events.length > 0 && (
              <div className="p-5 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Resumen del mes
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-lg font-bold text-blue-600">
                      {events.filter((e) => e.type === 'task').length}
                    </p>
                    <p className="text-xs text-blue-600/70">Tareas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <p className="text-lg font-bold text-green-600">
                      {events.filter((e) => e.type === 'milestone').length}
                    </p>
                    <p className="text-xs text-green-600/70">Microobjetivos</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overlay for panel */}
        {panelOpen && (
          <div
            className="fixed inset-0 bg-black/10 z-40"
            onClick={() => { setPanelOpen(false); setSelectedEvent(null) }}
          />
        )}

        {/* ── Create Task Modal ─────────────────────────────────────── */}
        {createModalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setCreateModalOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Nuevo recordatorio
                  </h3>
                  <button
                    onClick={() => setCreateModalOpen(false)}
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
                      value={createForm.title}
                      onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ej: Revisar campana de ads"
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                    <textarea
                      value={createForm.description}
                      onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Detalles opcionales..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={createDate}
                      onChange={e => setCreateDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Proyecto (opcional)
                    </label>
                    <select
                      value={createForm.projectId}
                      onChange={e => setCreateForm(f => ({ ...f, projectId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Sin proyecto</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setCreateModalOpen(false)}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateTask}
                      disabled={creating || !createForm.title.trim()}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                      Crear recordatorio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
