'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth'
import { Calendar as CalIcon, ChevronLeft, ChevronRight, CheckSquare, MessageSquare, DollarSign, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  type: 'task' | 'meeting' | 'payment'
  title: string
  date: string
  status?: string
  priority?: string
  amount?: number
  client?: string
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function CalendarPage() {
  const { org } = useAuthStore()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(j => { setEvents(j.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [month, year])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.date)
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year
    })
  }

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
    setSelectedDay(null)
  }

  const today = new Date()
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : []

  const typeIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
      case 'meeting': return <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
      case 'payment': return <DollarSign className="h-3.5 w-3.5 text-yellow-400" />
      default: return <Clock className="h-3.5 w-3.5 text-zinc-400" />
    }
  }

  const typeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-500'
      case 'meeting': return 'bg-indigo-500'
      case 'payment': return 'bg-yellow-500'
      default: return 'bg-zinc-500'
    }
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario" description="Tareas, reuniones y pagos del mes" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <ChevronLeft className="h-5 w-5 text-zinc-400" />
            </button>
            <h2 className="text-lg font-semibold text-white">{MONTHS[month - 1]} {year}</h2>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-zinc-500 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const isSelected = selectedDay === day

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'relative flex flex-col items-center py-2 rounded-lg text-sm transition-colors min-h-[52px]',
                    isSelected ? 'bg-indigo-600 text-white' : isToday(day) ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-zinc-800 text-zinc-300'
                  )}
                >
                  <span className={cn('text-sm', isToday(day) && !isSelected && 'font-bold')}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <div key={j} className={cn('w-1.5 h-1.5 rounded-full', typeColor(e.type))} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Tareas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-indigo-500" /> Reuniones
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-yellow-500" /> Pagos
            </div>
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-semibold text-white mb-4">
            {selectedDay ? `${selectedDay} de ${MONTHS[month - 1]}` : 'Selecciona un día'}
          </h3>

          {!selectedDay ? (
            <p className="text-sm text-zinc-500">Haz clic en un día para ver sus eventos.</p>
          ) : selectedEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sin eventos este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="mt-0.5">{typeIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500 capitalize">{event.type === 'task' ? 'Tarea' : event.type === 'meeting' ? 'Reunión' : 'Pago'}</span>
                      {event.client && <span className="text-xs text-zinc-600">• {event.client}</span>}
                    </div>
                    {event.amount && <p className="text-xs text-yellow-400 mt-1">${event.amount.toLocaleString()}</p>}
                    {event.status && (
                      <span className={cn(
                        'inline-block text-xs px-1.5 py-0.5 rounded mt-1',
                        event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        event.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-700 text-zinc-300'
                      )}>{event.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary counters */}
          {events.length > 0 && (
            <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2">
              <p className="text-xs font-medium text-zinc-400 mb-2">Resumen del mes</p>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Tareas</span>
                <span className="text-blue-400">{events.filter(e => e.type === 'task').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Reuniones</span>
                <span className="text-indigo-400">{events.filter(e => e.type === 'meeting').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Pagos pendientes</span>
                <span className="text-yellow-400">{events.filter(e => e.type === 'payment').length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
