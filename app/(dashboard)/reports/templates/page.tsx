'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/use-toast'
import {
  FileText,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  Send,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  X,
  ChevronDown,
  Zap,
} from 'lucide-react'

interface TemplateSection {
  type: string
  enabled: boolean
  title: string
}

interface Client {
  id: string
  name: string
  email?: string
}

interface ReportTemplate {
  id: string
  name: string
  description: string | null
  report_type: string
  sections: TemplateSection[]
  is_scheduled: boolean
  schedule_frequency: string | null
  schedule_day: number | null
  auto_send: boolean
  client_id: string | null
  clients: Client | null
  last_generated_at: string | null
  next_generation_at: string | null
  created_at: string
}

const DEFAULT_SECTIONS: TemplateSection[] = [
  { type: 'executive_summary', enabled: true, title: 'Resumen Ejecutivo' },
  { type: 'completed_tasks', enabled: true, title: 'Tareas Completadas' },
  { type: 'active_projects', enabled: true, title: 'Proyectos Activos' },
  { type: 'kpis', enabled: true, title: 'KPIs' },
  { type: 'time_summary', enabled: true, title: 'Horas Registradas' },
  { type: 'financial_summary', enabled: true, title: 'Resumen Financiero' },
  { type: 'next_steps', enabled: true, title: 'Proximos Pasos' },
]

const frequencyLabel: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
}

const dayOfWeekLabel: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
}

export default function ReportTemplatesPage() {
  const { user } = useCurrentUser()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formReportType, setFormReportType] = useState('monthly')
  const [formClientId, setFormClientId] = useState('')
  const [formSections, setFormSections] = useState<TemplateSection[]>(DEFAULT_SECTIONS)
  const [formIsScheduled, setFormIsScheduled] = useState(false)
  const [formFrequency, setFormFrequency] = useState('monthly')
  const [formScheduleDay, setFormScheduleDay] = useState(1)
  const [formAutoSend, setFormAutoSend] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/report-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.data || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadTemplates()
    loadClients()
  }, [loadTemplates, loadClients])

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormReportType('monthly')
    setFormClientId('')
    setFormSections(DEFAULT_SECTIONS.map(s => ({ ...s })))
    setFormIsScheduled(false)
    setFormFrequency('monthly')
    setFormScheduleDay(1)
    setFormAutoSend(false)
    setEditingTemplate(null)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function openEditModal(template: ReportTemplate) {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormDescription(template.description || '')
    setFormReportType(template.report_type || 'monthly')
    setFormClientId(template.client_id || '')
    setFormSections(
      template.sections?.length
        ? template.sections.map(s => ({ ...s }))
        : DEFAULT_SECTIONS.map(s => ({ ...s }))
    )
    setFormIsScheduled(template.is_scheduled)
    setFormFrequency(template.schedule_frequency || 'monthly')
    setFormScheduleDay(template.schedule_day ?? 1)
    setFormAutoSend(template.auto_send)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        report_type: formReportType,
        sections: formSections,
        is_scheduled: formIsScheduled,
        schedule_frequency: formIsScheduled ? formFrequency : null,
        schedule_day: formIsScheduled ? formScheduleDay : null,
        auto_send: formAutoSend,
        client_id: formClientId || null,
      }

      const url = editingTemplate
        ? `/api/report-templates/${editingTemplate.id}`
        : '/api/report-templates'
      const method = editingTemplate ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast({ title: editingTemplate ? 'Plantilla actualizada' : 'Plantilla creada' })
        setShowModal(false)
        resetForm()
        loadTemplates()
      } else {
        const err = await res.json()
        toast({ title: err.error || 'Error al guardar', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta plantilla? Los reportes ya generados no se eliminaran.')) return

    const res = await fetch(`/api/report-templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Plantilla eliminada' })
      loadTemplates()
    } else {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  async function toggleSchedule(template: ReportTemplate) {
    const res = await fetch(`/api/report-templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_scheduled: !template.is_scheduled }),
    })
    if (res.ok) {
      toast({ title: template.is_scheduled ? 'Programacion desactivada' : 'Programacion activada' })
      loadTemplates()
    }
  }

  function toggleSection(index: number) {
    setFormSections(prev => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s))
  }

  function formatDate(iso: string | null) {
    if (!iso) return '--'
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getScheduleLabel(template: ReportTemplate) {
    if (!template.is_scheduled || !template.schedule_frequency) return 'Sin programar'
    const freq = frequencyLabel[template.schedule_frequency] || template.schedule_frequency
    if (template.schedule_frequency === 'weekly' || template.schedule_frequency === 'biweekly') {
      const day = dayOfWeekLabel[template.schedule_day ?? 1] || `Dia ${template.schedule_day}`
      return `${freq} — ${day}`
    }
    return `${freq} — Dia ${template.schedule_day || 1}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Plantillas de reportes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configura plantillas y programacion automatica de reportes
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </button>
      </div>

      {/* Templates list */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay plantillas"
          description="Crea una plantilla para automatizar la generacion de reportes"
          action={
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nueva plantilla
            </button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
                    {template.is_scheduled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Zap className="h-3 w-3" />
                        Programado
                      </span>
                    )}
                    {template.auto_send && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <Send className="h-3 w-3" />
                        Auto-envio
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    {template.clients && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {template.clients.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {getScheduleLabel(template)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Ultimo: {formatDate(template.last_generated_at)}
                    </span>
                    {template.next_generation_at && (
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        Proxima: {formatDate(template.next_generation_at)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(template.sections || [])
                      .filter(s => s.enabled)
                      .map(s => (
                        <span
                          key={s.type}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {s.title}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <button
                    onClick={() => toggleSchedule(template)}
                    title={template.is_scheduled ? 'Desactivar programacion' : 'Activar programacion'}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    {template.is_scheduled ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="rounded-lg border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <button
              onClick={() => { setShowModal(false); resetForm() }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-slate-900 mb-5">
              {editingTemplate ? 'Editar plantilla' : 'Nueva plantilla de reporte'}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Reporte mensual de rendimiento"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Descripcion opcional de la plantilla..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Report type + Client */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de reporte</label>
                  <select
                    value={formReportType}
                    onChange={e => setFormReportType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <select
                    value={formClientId}
                    onChange={e => setFormClientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Todos los clientes</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sections */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Secciones del reporte</label>
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  {formSections.map((section, idx) => (
                    <label
                      key={section.type}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={() => toggleSection(idx)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${section.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                        {section.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule toggle */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Programar generacion automatica</p>
                    <p className="text-xs text-slate-500">El reporte se generara automaticamente segun la frecuencia</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormIsScheduled(!formIsScheduled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formIsScheduled ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formIsScheduled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </label>

                {formIsScheduled && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Frecuencia</label>
                      <select
                        value={formFrequency}
                        onChange={e => setFormFrequency(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="biweekly">Quincenal</option>
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {formFrequency === 'weekly' || formFrequency === 'biweekly'
                          ? 'Dia de la semana'
                          : 'Dia del mes'}
                      </label>
                      {formFrequency === 'weekly' || formFrequency === 'biweekly' ? (
                        <select
                          value={formScheduleDay}
                          onChange={e => setFormScheduleDay(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(dayOfWeekLabel).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={formScheduleDay}
                          onChange={e => setFormScheduleDay(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Auto-send */}
                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-enviar al cliente</p>
                    <p className="text-xs text-slate-500">Envia el reporte por email al generarse</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormAutoSend(!formAutoSend)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formAutoSend ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formAutoSend ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingTemplate ? 'Guardar cambios' : 'Crear plantilla'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
