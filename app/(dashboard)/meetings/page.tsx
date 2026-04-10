'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { MessageSquare, Plus, Calendar, Users, ChevronDown, ChevronUp, ArrowRight, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Meeting {
  id: string
  title: string
  date: string
  attendees: string[]
  summary: string | null
  decisions: string | null
  agreedTasks: { title: string; assignedTo?: string; deadline?: string }[] | null
  nextMeetingDate: string | null
  notes: string | null
  client: { id: string; name: string } | null
  createdBy: { id: string; fullName: string } | null
}

export default function MeetingsPage() {
  const { org } = useCurrentUser()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([])

  const fetchMeetings = useCallback(async () => {
    const res = await fetch('/api/meetings')
    if (res.ok) {
      const json = await res.json()
      setMeetings(json.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMeetings()
    fetch('/api/clients').then(r => r.json()).then(j => setClients(j.data || []))
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data || []))
  }, [fetchMeetings])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    const agreedTasksRaw = form.get('agreedTasks') as string
    const agreedTasks = agreedTasksRaw
      ? agreedTasksRaw.split('\n').filter(Boolean).map(line => ({ title: line.trim() }))
      : []

    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        clientId: form.get('clientId') || undefined,
        date: form.get('date'),
        attendees: (form.get('attendees') as string).split(',').map(s => s.trim()).filter(Boolean),
        summary: form.get('summary') || undefined,
        decisions: form.get('decisions') || undefined,
        agreedTasks,
        nextMeetingDate: form.get('nextMeetingDate') || undefined,
        notes: form.get('notes') || undefined,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      fetchMeetings()
    }
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minutas"
        description="Registros de reuniones, decisiones y acuerdos"
        action={
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nueva minuta'}
          </button>
        }
      />

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-[var(--border-base)] bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Título *</label>
              <input name="title" required className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" placeholder="Reunión semanal..." />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Cliente</label>
              <select name="clientId" className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Sin cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Fecha *</label>
              <input name="date" type="datetime-local" required className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Asistentes (separados por coma)</label>
              <input name="attendees" className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" placeholder="Juan, María, Carlos..." />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Resumen</label>
            <textarea name="summary" rows={3} className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" placeholder="Resumen de la reunión..." />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Decisiones</label>
            <textarea name="decisions" rows={2} className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" placeholder="Decisiones tomadas..." />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Tareas acordadas (una por línea → se crean automáticamente)</label>
            <textarea name="agreedTasks" rows={3} className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" placeholder="Crear landing page&#10;Revisar campañas Meta&#10;Enviar reporte mensual" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Próxima reunión</label>
              <input name="nextMeetingDate" type="datetime-local" className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Notas adicionales</label>
              <input name="notes" className="w-full bg-slate-100 border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white" placeholder="Notas..." />
            </div>
          </div>

          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Guardar minuta
          </button>
        </form>
      )}

      {/* Meetings List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-12 text-center">
          <MessageSquare className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No hay minutas aún</h3>
          <p className="text-sm text-[var(--text-muted)]">Registra tu primera reunión y convierte acuerdos en tareas automáticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(meeting => (
            <div key={meeting.id} className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === meeting.id ? null : meeting.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="rounded-lg bg-indigo-500/10 p-2 flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-white truncate">{meeting.title}</p>
                    {meeting.client && (
                      <span className="text-xs bg-slate-100 text-[var(--text-muted)] px-2 py-0.5 rounded-full">{meeting.client.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(meeting.date)}</span>
                    {meeting.attendees.length > 0 && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {meeting.attendees.length} asistentes</span>
                    )}
                    {meeting.agreedTasks && Array.isArray(meeting.agreedTasks) && (
                      <span className="text-indigo-400">{(meeting.agreedTasks as { title: string }[]).length} tareas</span>
                    )}
                  </div>
                </div>
                {expanded === meeting.id ? <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />}
              </button>

              {expanded === meeting.id && (
                <div className="px-5 pb-5 border-t border-[var(--border-base)] space-y-4 pt-4">
                  {meeting.summary && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Resumen</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.summary}</p>
                    </div>
                  )}
                  {meeting.decisions && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Decisiones</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.decisions}</p>
                    </div>
                  )}
                  {meeting.agreedTasks && Array.isArray(meeting.agreedTasks) && (meeting.agreedTasks as { title: string }[]).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Tareas acordadas</p>
                      <div className="space-y-1">
                        {(meeting.agreedTasks as { title: string }[]).map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                            <span className="text-slate-700">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {meeting.attendees.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Asistentes</p>
                      <div className="flex flex-wrap gap-1">
                        {meeting.attendees.map((a, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {meeting.nextMeetingDate && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Próxima reunión: <span className="text-slate-700">{formatDate(meeting.nextMeetingDate)}</span>
                    </p>
                  )}
                  {meeting.notes && <p className="text-xs text-[var(--text-secondary)] italic">{meeting.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
