'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Video,
  Plus,
  X,
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
  client?: { name: string } | null
}

interface CalendarMeeting {
  id: string
  title: string
  date: string
  client?: { name: string } | null
}

interface DayEvent {
  id: string
  type: 'task' | 'meeting'
  title: string
  date: string
  status?: string
  priority?: string
  client?: string
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarPage() {
  const { org } = useAuthStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<DayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

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
          client: t.client?.name,
        })),
        ...(data.meetings || []).map((m: CalendarMeeting) => ({
          id: m.id,
          type: 'meeting' as const,
          title: m.title,
          date: m.date,
          client: m.client?.name,
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
    if (org) fetchEvents()
  }, [org, fetchEvents])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date): DayEvent[] => {
    return events.filter((e) => {
      const eventDate = parseISO(e.date)
      return isSameDay(eventDate, day)
    })
  }

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setPanelOpen(true)
  }

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : []

  const taskCount = (day: Date) =>
    getEventsForDay(day).filter((e) => e.type === 'task').length
  const meetingCount = (day: Date) =>
    getEventsForDay(day).filter((e) => e.type === 'meeting').length

  if (!org) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualiza tareas y reuniones del mes
          </p>
        </div>
      </div>

      <div className="relative flex gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <div className="grid grid-cols-7 gap-1 mb-2">
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
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                const isSelected =
                  selectedDay && isSameDay(day, selectedDay)
                const dayTasks = taskCount(day)
                const dayMeetings = meetingCount(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'relative flex flex-col items-start p-2 rounded-lg text-sm transition-all min-h-[72px] border',
                      inMonth
                        ? 'text-slate-900'
                        : 'text-slate-300',
                      today && !isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-transparent',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : inMonth
                        ? 'hover:bg-slate-50'
                        : 'hover:bg-slate-50/50'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        today && !isSelected && 'text-blue-600 font-bold'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {(dayTasks > 0 || dayMeetings > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dayTasks > 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            <CheckSquare className="h-2.5 w-2.5" />
                            {dayTasks}
                          </span>
                        )}
                        {dayMeetings > 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            <Video className="h-2.5 w-2.5" />
                            {dayMeetings}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Tareas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-green-600" /> Reuniones
            </div>
          </div>
        </div>

        {/* Slide-in Day Panel */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 transition-transform duration-300 ease-in-out',
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedDay
                    ? format(selectedDay, "d 'de' MMMM, yyyy", {
                        locale: es,
                      })
                    : 'Selecciona un día'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEvents.length} evento
                  {selectedEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalIcon className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">
                    Sin eventos este día
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Haz clic en + para agregar uno
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm',
                        event.type === 'task'
                          ? 'border-blue-200 bg-blue-50/50'
                          : 'border-green-200 bg-green-50/50'
                      )}
                    >
                      <div className="mt-0.5">
                        {event.type === 'task' ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Video className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {event.type === 'task' ? 'Tarea' : 'Reunión'}
                          </span>
                          {event.client && (
                            <span className="text-xs text-slate-400">
                              &bull; {event.client}
                            </span>
                          )}
                        </div>
                        {event.status && (
                          <span
                            className={cn(
                              'inline-block text-xs px-2 py-0.5 rounded-full mt-1.5 font-medium',
                              event.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : event.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : event.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            )}
                          >
                            {event.status === 'completed'
                              ? 'Completada'
                              : event.status === 'pending'
                              ? 'Pendiente'
                              : event.status === 'in_progress'
                              ? 'En progreso'
                              : event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                      {events.filter((e) => e.type === 'meeting').length}
                    </p>
                    <p className="text-xs text-green-600/70">Reuniones</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overlay */}
        {panelOpen && (
          <div
            className="fixed inset-0 bg-black/10 z-40"
            onClick={() => setPanelOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
