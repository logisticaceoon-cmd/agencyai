'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Printer,
  Save,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Clock,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface AgendaItem {
  text: string
  done: boolean
}

interface Decision {
  text: string
}

interface ActionItem {
  description: string
  assignee: string
  supervisor: string
  deadline: string
  status: string
  created: boolean
}

interface NextStep {
  text: string
}

interface MinuteDetail {
  id: string
  title: string
  meeting_date: string | null
  participants: string[]
  meeting_type: string
  duration_minutes: number | null
  status: string
  client_id: string | null
  client_name?: string | null
  project_id: string | null
  project_name?: string | null
  agenda: AgendaItem[]
  discussion_points: string
  decisions: Decision[]
  action_items: ActionItem[]
  next_steps: NextStep[]
  created_at: string
  updated_at: string
}

const MEETING_TYPES = [
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'followup', label: 'Seguimiento' },
  { value: 'review', label: 'Revision' },
  { value: 'closure', label: 'Cierre' },
  { value: 'strategy', label: 'Estrategia' },
  { value: 'other', label: 'Otro' },
]

const MEETING_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MEETING_TYPES.map((t) => [t.value, t.label])
)

export default function MinuteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { org } = useCurrentUser()
  const id = params.id as string

  const [minute, setMinute] = useState<MinuteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [creatingTask, setCreatingTask] = useState<number | null>(null)

  // Editable fields
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingType, setMeetingType] = useState('followup')
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [participants, setParticipants] = useState<string[]>([])
  const [participantInput, setParticipantInput] = useState('')
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [discussionPoints, setDiscussionPoints] = useState('')
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [nextSteps, setNextSteps] = useState<NextStep[]>([])
  const [status, setStatus] = useState('draft')

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMinute = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/minutes/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      const m = data.data as MinuteDetail
      setMinute(m)
      setTitle(m.title)
      setMeetingDate(m.meeting_date ? m.meeting_date.slice(0, 16) : '')
      setMeetingType(m.meeting_type || 'followup')
      setDurationMinutes(m.duration_minutes)
      setParticipants(m.participants || [])
      setAgenda((m.agenda || []).map((a: any) => ({ text: a.text || a, done: a.done || false })))
      setDiscussionPoints(m.discussion_points || '')
      setDecisions(m.decisions || [])
      setActionItems(
        (m.action_items || []).map((ai: any) => ({
          description: ai.description || '',
          assignee: ai.assignee || '',
          supervisor: ai.supervisor || '',
          deadline: ai.deadline || '',
          status: ai.status || 'pending',
          created: ai.created || false,
        }))
      )
      setNextSteps(m.next_steps || [])
      setStatus(m.status)
    } catch {
      setMinute(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (org && id) fetchMinute()
  }, [org, id, fetchMinute])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!minute) return
    autoSaveRef.current = setInterval(() => {
      doSave(true)
    }, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minute, title, agenda, discussionPoints, decisions, actionItems, nextSteps, status, meetingDate, meetingType, durationMinutes, participants])

  const doSave = async (silent = false) => {
    if (!silent) setSaving(true)
    try {
      await fetch(`/api/minutes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          meeting_date: meetingDate || undefined,
          meeting_type: meetingType,
          duration_minutes: durationMinutes,
          participants,
          agenda,
          discussion_points: discussionPoints,
          decisions,
          action_items: actionItems,
          next_steps: nextSteps,
          status,
        }),
      })
      setLastSaved(new Date())
    } catch {
      // ignore
    } finally {
      if (!silent) setSaving(false)
    }
  }

  const handleSave = () => doSave(false)

  const handleCreateTask = async (index: number) => {
    const item = actionItems[index]
    if (!item || item.created) return
    setCreatingTask(index)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.description,
          assignedTo: item.assignee ? [item.assignee] : [],
          deadline: item.deadline || undefined,
          description: `Creada desde minuta: ${title}`,
          status: 'pending',
          priority: 'medium',
        }),
      })
      if (res.ok) {
        const updated = [...actionItems]
        updated[index] = { ...updated[index], created: true }
        setActionItems(updated)
      }
    } catch {
      // ignore
    } finally {
      setCreatingTask(null)
    }
  }

  const addParticipant = () => {
    if (!participantInput.trim()) return
    setParticipants((prev) => [...prev, participantInput.trim()])
    setParticipantInput('')
  }

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index))
  }

  const addAgendaItem = () => setAgenda((prev) => [...prev, { text: '', done: false }])
  const removeAgendaItem = (index: number) => setAgenda((prev) => prev.filter((_, i) => i !== index))
  const updateAgendaItem = (index: number, text: string) => setAgenda((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)))
  const toggleAgendaItem = (index: number) => setAgenda((prev) => prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item)))

  const addDecision = () => setDecisions((prev) => [...prev, { text: '' }])
  const removeDecision = (index: number) => setDecisions((prev) => prev.filter((_, i) => i !== index))
  const updateDecision = (index: number, text: string) => setDecisions((prev) => prev.map((item, i) => (i === index ? { text } : item)))

  const addActionItem = () => setActionItems((prev) => [...prev, { description: '', assignee: '', supervisor: '', deadline: '', status: 'pending', created: false }])
  const removeActionItem = (index: number) => setActionItems((prev) => prev.filter((_, i) => i !== index))
  const updateActionItem = (index: number, field: keyof ActionItem, value: string | boolean) => {
    setActionItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const addNextStep = () => setNextSteps((prev) => [...prev, { text: '' }])
  const removeNextStep = (index: number) => setNextSteps((prev) => prev.filter((_, i) => i !== index))
  const updateNextStep = (index: number, text: string) => setNextSteps((prev) => prev.map((item, i) => (i === index ? { text } : item)))

  const handleExportPDF = () => window.print()

  function timeSinceSaved(): string {
    if (!lastSaved) return ''
    const diff = Math.round((Date.now() - lastSaved.getTime()) / 1000)
    if (diff < 5) return 'Guardado'
    if (diff < 60) return `Guardado hace ${diff}s`
    return `Guardado hace ${Math.round(diff / 60)}min`
  }

  if (!org) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!minute) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-slate-300 mb-3" strokeWidth={1.5} />
        <p className="text-[var(--text-muted)] text-sm">Minuta no encontrada</p>
        <Link href="/minutes" className="mt-3 text-sm text-[var(--blue)] hover:underline">
          Volver a minutas
        </Link>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #minute-print-area, #minute-print-area * { visibility: visible; }
          #minute-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
          .no-print { display: none !important; }
          button, nav, aside, header { display: none !important; }
          * { color: black !important; background: white !important; border-color: #e2e8f0 !important; }
          #minute-print-header { display: flex !important; }
        }
        #minute-print-header { display: none; }
      `}</style>

      <div className="space-y-6">
        {/* Back & Actions */}
        <div className="flex items-center justify-between no-print">
          <Link href="/minutes" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Volver a minutas
          </Link>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-[var(--text-muted)]">{timeSinceSaved()}</span>
            )}
            <button onClick={handleExportPDF} className="btn-secondary text-sm py-2 px-3">
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              Exportar PDF
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2 px-4">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
              Guardar cambios
            </button>
          </div>
        </div>

        <div id="minute-print-area" className="space-y-6">
          {/* Print header */}
          <div id="minute-print-header" className="items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">AgencyAI</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-sm text-slate-500">{minute.client_name || ''}</span>
            <span className="ml-auto text-sm text-slate-500">{meetingDate ? formatDate(meetingDate) : ''}</span>
          </div>

          {/* Header Card */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold text-[var(--text-primary)] bg-transparent border-none outline-none w-full p-0"
              placeholder="Titulo de la minuta"
            />
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={cn(
                  'no-print rounded-full px-2.5 py-0.5 text-xs font-semibold border-none outline-none cursor-pointer',
                  status === 'final' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                )}
              >
                <option value="draft">Borrador</option>
                <option value="final">Finalizada</option>
              </select>
              {minute.client_name && (
                <span className="text-sm text-[var(--text-secondary)]">Cliente: {minute.client_name}</span>
              )}
              {minute.project_name && (
                <span className="text-sm text-[var(--text-secondary)]">Proyecto: {minute.project_name}</span>
              )}
            </div>
          </div>

          {/* Section 1 — Meeting Info */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Informacion de la reunion</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Tipo de reunion</label>
                <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className="input">
                  {MEETING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Duracion (minutos)</label>
                <input
                  type="number"
                  value={durationMinutes ?? ''}
                  onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  placeholder="60"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="label">Participantes</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {participants.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-semibold text-blue-700">
                      {p.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')}
                    </span>
                    {p}
                    <button onClick={() => removeParticipant(i)} className="no-print text-slate-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 no-print">
                <input
                  type="text"
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant() } }}
                  className="input flex-1"
                  placeholder="Email o nombre + Enter"
                />
                <button onClick={addParticipant} className="btn-secondary text-sm py-2 px-3">Agregar</button>
              </div>
            </div>
          </div>

          {/* Section 2 — Agenda */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Agenda</h2>
              <button onClick={addAgendaItem} className="no-print inline-flex items-center gap-1 text-xs font-medium text-[var(--blue)] hover:text-[#1d4ed8] transition-colors">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Agregar punto
              </button>
            </div>
            {agenda.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No hay items en la agenda</p>
            ) : (
              <ol className="space-y-2">
                {agenda.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 group">
                    <button onClick={() => toggleAgendaItem(index)} className={cn(
                      'flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors',
                      item.done ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 hover:border-blue-400'
                    )}>
                      {item.done && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateAgendaItem(index, e.target.value)}
                      className={cn('flex-1 text-sm bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1', item.done && 'line-through text-slate-400')}
                      placeholder="Punto de agenda..."
                    />
                    <button onClick={() => removeAgendaItem(index)} className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Section 3 — Discussion Points */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Resumen de la reunion</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">Puntos discutidos y decisiones tomadas</p>
            <textarea
              value={discussionPoints}
              onChange={(e) => setDiscussionPoints(e.target.value)}
              className="w-full min-h-[200px] text-sm text-[var(--text-primary)] bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-[var(--radius-md)] p-4 focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)] outline-none resize-y"
              placeholder="Describe los puntos discutidos durante la reunion..."
            />
          </div>

          {/* Section 4 — Action Items */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Tareas pendientes (Action Items)</h2>
              <button onClick={addActionItem} className="no-print inline-flex items-center gap-1 text-xs font-medium text-[var(--blue)] hover:text-[#1d4ed8] transition-colors">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Agregar tarea
              </button>
            </div>
            {actionItems.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No hay action items registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-base)]">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tarea</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-32">Responsable</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-32">Supervisor</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-32">Fecha limite</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-28">Estado</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-32 no-print">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((item, index) => (
                      <tr key={index} className="border-b border-[var(--bg-muted)] group">
                        <td className="py-2 px-2">
                          <input type="text" value={item.description} onChange={(e) => updateActionItem(index, 'description', e.target.value)}
                            className="w-full text-sm text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1" placeholder="Descripcion..." />
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" value={item.assignee} onChange={(e) => updateActionItem(index, 'assignee', e.target.value)}
                            className="w-full text-sm text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1" placeholder="Responsable" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" value={item.supervisor} onChange={(e) => updateActionItem(index, 'supervisor', e.target.value)}
                            className="w-full text-sm text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1" placeholder="Supervisor" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="date" value={item.deadline} onChange={(e) => updateActionItem(index, 'deadline', e.target.value)}
                            className="w-full text-sm text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1" />
                        </td>
                        <td className="py-2 px-2">
                          <select value={item.status} onChange={(e) => updateActionItem(index, 'status', e.target.value)}
                            className="text-xs rounded-full px-2 py-0.5 font-medium border-none outline-none cursor-pointer bg-slate-100 text-slate-600">
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En progreso</option>
                            <option value="completed">Completada</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center no-print">
                          <div className="flex items-center justify-center gap-2">
                            {item.created ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Creada
                              </span>
                            ) : (
                              <button onClick={() => handleCreateTask(index)} disabled={creatingTask === index}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--blue)] hover:text-[#1d4ed8] disabled:opacity-50 transition-colors">
                                {creatingTask === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                                Crear tarea
                              </button>
                            )}
                            <button onClick={() => removeActionItem(index)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 5 — Next Steps */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Proximos pasos</h2>
              <button onClick={addNextStep} className="no-print inline-flex items-center gap-1 text-xs font-medium text-[var(--blue)] hover:text-[#1d4ed8] transition-colors">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Agregar paso
              </button>
            </div>
            {nextSteps.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No hay proximos pasos definidos</p>
            ) : (
              <ol className="space-y-2">
                {nextSteps.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateNextStep(index, e.target.value)}
                      className="flex-1 text-sm text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1"
                      placeholder="Proximo paso..."
                    />
                    <button onClick={() => removeNextStep(index)} className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Section 6 — Attachments (UI only) */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-6 shadow-[var(--shadow-sm)] no-print">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Archivos adjuntos</h2>
            <div className="border-2 border-dashed border-[var(--border-base)] rounded-[var(--radius-md)] p-8 text-center hover:border-[var(--blue)] transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[var(--text-muted)]">Arrastra archivos o hace click para adjuntar</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">PDF, DOC, IMG — Max 10MB</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
