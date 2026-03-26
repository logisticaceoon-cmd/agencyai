'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
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
} from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface AgendaItem {
  text: string
}

interface Decision {
  text: string
}

interface ActionItem {
  description: string
  assignee: string
  deadline: string
  created: boolean
}

interface MinuteDetail {
  id: string
  title: string
  meeting_date: string | null
  participants: string[]
  meeting_type: string
  status: string
  client_id: string | null
  client_name?: string | null
  project_id: string | null
  project_name?: string | null
  agenda: AgendaItem[]
  discussion_points: string
  decisions: Decision[]
  action_items: ActionItem[]
  created_at: string
  updated_at: string
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  kickoff: 'Kickoff',
  followup: 'Seguimiento',
  review: 'Revisión',
  closure: 'Cierre',
  other: 'Otro',
}

export default function MinuteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { org } = useAuthStore()
  const id = params.id as string

  const [minute, setMinute] = useState<MinuteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creatingTask, setCreatingTask] = useState<number | null>(null)

  // Editable fields
  const [title, setTitle] = useState('')
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [discussionPoints, setDiscussionPoints] = useState('')
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [status, setStatus] = useState('draft')

  const fetchMinute = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/minutes/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      const m = data.data as MinuteDetail
      setMinute(m)
      setTitle(m.title)
      setAgenda(m.agenda || [])
      setDiscussionPoints(m.discussion_points || '')
      setDecisions(m.decisions || [])
      setActionItems(
        (m.action_items || []).map((ai: ActionItem) => ({
          ...ai,
          created: ai.created || false,
        }))
      )
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

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/minutes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          agenda,
          discussion_points: discussionPoints,
          decisions,
          action_items: actionItems,
          status,
        }),
      })
      await fetchMinute()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

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

  const addAgendaItem = () => {
    setAgenda((prev) => [...prev, { text: '' }])
  }

  const removeAgendaItem = (index: number) => {
    setAgenda((prev) => prev.filter((_, i) => i !== index))
  }

  const updateAgendaItem = (index: number, text: string) => {
    setAgenda((prev) =>
      prev.map((item, i) => (i === index ? { text } : item))
    )
  }

  const addDecision = () => {
    setDecisions((prev) => [...prev, { text: '' }])
  }

  const removeDecision = (index: number) => {
    setDecisions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateDecision = (index: number, text: string) => {
    setDecisions((prev) =>
      prev.map((item, i) => (i === index ? { text } : item))
    )
  }

  const addActionItem = () => {
    setActionItems((prev) => [
      ...prev,
      { description: '', assignee: '', deadline: '', created: false },
    ])
  }

  const removeActionItem = (index: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateActionItem = (
    index: number,
    field: keyof ActionItem,
    value: string | boolean
  ) => {
    setActionItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  const handleExportPDF = () => {
    window.print()
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
        <FileText className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">Minuta no encontrada</p>
        <Link
          href="/minutes"
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Volver a minutas
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #minute-print-area,
          #minute-print-area * {
            visibility: visible;
          }
          #minute-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
          }
          .no-print {
            display: none !important;
          }
          button,
          nav,
          aside,
          header {
            display: none !important;
          }
          * {
            color: black !important;
            background: white !important;
            border-color: #e2e8f0 !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Back & Actions */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/minutes"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a minutas
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Exportar PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </button>
          </div>
        </div>

        <div id="minute-print-area" className="space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none w-full focus:ring-0 p-0 no-print-input"
                  placeholder="Título de la minuta"
                />
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                  {minute.meeting_date && (
                    <span>{formatDateTime(minute.meeting_date)}</span>
                  )}
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      'bg-blue-50 text-blue-700'
                    )}
                  >
                    {MEETING_TYPE_LABELS[minute.meeting_type] ||
                      minute.meeting_type}
                  </span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-none outline-none cursor-pointer no-print',
                      status === 'final'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    <option value="draft">Borrador</option>
                    <option value="final">Finalizada</option>
                  </select>
                </div>
                {minute.client_name && (
                  <p className="text-sm text-slate-500 mt-2">
                    Cliente: {minute.client_name}
                  </p>
                )}
                {minute.project_name && (
                  <p className="text-sm text-slate-500 mt-1">
                    Proyecto: {minute.project_name}
                  </p>
                )}
                {minute.participants && minute.participants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {minute.participants.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-semibold text-blue-700">
                          {p
                            .split(/[\s@]+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase() || '')
                            .join('')}
                        </span>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Agenda
              </h2>
              <button
                onClick={addAgendaItem}
                className="no-print inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar item
              </button>
            </div>
            {agenda.length === 0 ? (
              <p className="text-sm text-slate-400">
                No hay items en la agenda
              </p>
            ) : (
              <ol className="space-y-2">
                {agenda.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 group"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateAgendaItem(index, e.target.value)
                      }
                      className="flex-1 text-sm text-slate-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1"
                      placeholder="Punto de agenda..."
                    />
                    <button
                      onClick={() => removeAgendaItem(index)}
                      className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Puntos Discutidos */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Puntos discutidos
            </h2>
            <textarea
              value={discussionPoints}
              onChange={(e) => setDiscussionPoints(e.target.value)}
              className="w-full min-h-[160px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              placeholder="Describe los puntos discutidos durante la reunión..."
            />
          </div>

          {/* Decisiones Tomadas */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Decisiones tomadas
              </h2>
              <button
                onClick={addDecision}
                className="no-print inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar decisión
              </button>
            </div>
            {decisions.length === 0 ? (
              <p className="text-sm text-slate-400">
                No hay decisiones registradas
              </p>
            ) : (
              <ul className="space-y-2">
                {decisions.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 group"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateDecision(index, e.target.value)
                      }
                      className="flex-1 text-sm text-slate-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1"
                      placeholder="Decisión..."
                    />
                    <button
                      onClick={() => removeDecision(index)}
                      className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Items */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Action Items
              </h2>
              <button
                onClick={addActionItem}
                className="no-print inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar item
              </button>
            </div>
            {actionItems.length === 0 ? (
              <p className="text-sm text-slate-400">
                No hay action items registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                        Responsable
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">
                        Fecha límite
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40 no-print">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-100 group"
                      >
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateActionItem(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            className="w-full text-sm text-slate-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1"
                            placeholder="Descripción del action item..."
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.assignee}
                            onChange={(e) =>
                              updateActionItem(
                                index,
                                'assignee',
                                e.target.value
                              )
                            }
                            className="w-full text-sm text-slate-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1"
                            placeholder="Responsable"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={item.deadline}
                            onChange={(e) =>
                              updateActionItem(
                                index,
                                'deadline',
                                e.target.value
                              )
                            }
                            className="w-full text-sm text-slate-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none py-1"
                          />
                        </td>
                        <td className="py-2 px-2 text-center no-print">
                          <div className="flex items-center justify-center gap-2">
                            {item.created ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Creada
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCreateTask(index)}
                                disabled={creatingTask === index}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {creatingTask === index ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-3.5 w-3.5" />
                                )}
                                Crear como tarea
                              </button>
                            )}
                            <button
                              onClick={() => removeActionItem(index)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      </div>
    </>
  )
}
