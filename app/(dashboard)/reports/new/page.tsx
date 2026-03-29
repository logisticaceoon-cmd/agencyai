'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Printer,
  Save,
  Loader2,
  Eye,
} from 'lucide-react'

interface Client {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  status: string
}

interface Project {
  id: string
  name: string
  status: string
}

interface KpiRow {
  label: string
  value: string
}

interface NextStep {
  text: string
}

export default function NewReportPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 data
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [title, setTitle] = useState('')

  // Step 2 data
  const [sections, setSections] = useState({
    executiveSummary: true,
    completedTasks: true,
    activeProjects: true,
    kpis: true,
    nextSteps: true,
  })
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [tasks, setTasks] = useState<(Task & { selected: boolean })[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [kpis, setKpis] = useState<KpiRow[]>([
    { label: 'Leads generados', value: '' },
    { label: 'Tasa de conversion', value: '' },
    { label: 'Inversion publicitaria', value: '' },
  ])
  const [nextSteps, setNextSteps] = useState<NextStep[]>([
    { text: '' },
    { text: '' },
  ])

  // Load clients
  useEffect(() => {
    async function loadClients() {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.data || [])
      }
    }
    loadClients()
  }, [])

  // Auto-generate title when client or type changes
  useEffect(() => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      const typeLabels: Record<string, string> = {
        weekly: 'Semanal',
        monthly: 'Mensual',
        custom: 'Personalizado',
      }
      const period = dateStart && dateEnd ? ` (${dateStart} - ${dateEnd})` : ''
      setTitle(`Reporte ${typeLabels[reportType]} - ${client.name}${period}`)
    }
  }, [clientId, reportType, dateStart, dateEnd, clients])

  // Load tasks and projects when entering step 2
  useEffect(() => {
    if (step !== 2) return
    async function loadData() {
      const params = new URLSearchParams()
      if (dateStart) params.set('from', dateStart)
      if (dateEnd) params.set('to', dateEnd)
      if (clientId) params.set('clientId', clientId)

      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?status=done&limit=50&${params}`),
        fetch('/api/tasks?limit=1'), // Use projects endpoint if available
      ])

      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTasks((data.data || []).map((t: Task) => ({ ...t, selected: true })))
      }

      // Try to load projects
      try {
        const projRes = await fetch(`/api/clients?status=active`)
        if (projRes.ok) {
          const data = await projRes.json()
          setProjects(
            (data.data || []).map((c: Client) => ({
              id: c.id,
              name: c.name,
              status: 'active',
            }))
          )
        }
      } catch {
        // projects endpoint might not exist
      }
    }
    loadData()
  }, [step, dateStart, dateEnd, clientId])

  function toggleSection(key: keyof typeof sections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function addKpi() {
    setKpis((prev) => [...prev, { label: '', value: '' }])
  }

  function removeKpi(index: number) {
    setKpis((prev) => prev.filter((_, i) => i !== index))
  }

  function updateKpi(index: number, field: 'label' | 'value', val: string) {
    setKpis((prev) => prev.map((k, i) => (i === index ? { ...k, [field]: val } : k)))
  }

  function addNextStep() {
    setNextSteps((prev) => [...prev, { text: '' }])
  }

  function removeNextStep(index: number) {
    setNextSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateNextStep(index: number, text: string) {
    setNextSteps((prev) => prev.map((s, i) => (i === index ? { text } : s)))
  }

  function toggleTask(index: number) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    )
  }

  async function handleSave() {
    if (!clientId) {
      toast({ title: 'Selecciona un cliente', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const description = buildReportContent()
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          reportType: reportType === 'custom' ? 'monthly' : reportType,
          clientId,
          priority: 'medium',
          tags: [reportType],
        }),
      })
      if (res.ok) {
        toast({ title: 'Reporte guardado exitosamente' })
        router.push('/reports')
      } else {
        const err = await res.json()
        toast({
          title: 'Error al guardar',
          description: JSON.stringify(err.error),
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  function buildReportContent(): string {
    const parts: string[] = []

    if (sections.executiveSummary && executiveSummary) {
      parts.push(`## Resumen Ejecutivo\n${executiveSummary}`)
    }

    if (sections.completedTasks && tasks.some((t) => t.selected)) {
      const selectedTasks = tasks.filter((t) => t.selected)
      parts.push(
        `## Tareas Completadas\n${selectedTasks.map((t) => `- ${t.title}`).join('\n')}`
      )
    }

    if (sections.activeProjects && projects.length > 0) {
      parts.push(
        `## Proyectos Activos\n${projects.map((p) => `- ${p.name} (${p.status})`).join('\n')}`
      )
    }

    if (sections.kpis && kpis.some((k) => k.label && k.value)) {
      const validKpis = kpis.filter((k) => k.label && k.value)
      parts.push(
        `## KPIs\n${validKpis.map((k) => `- ${k.label}: ${k.value}`).join('\n')}`
      )
    }

    if (sections.nextSteps && nextSteps.some((s) => s.text)) {
      const validSteps = nextSteps.filter((s) => s.text)
      parts.push(
        `## Proximos Pasos\n${validSteps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}`
      )
    }

    return parts.join('\n\n')
  }

  function handlePrint() {
    window.print()
  }

  const selectedClient = clients.find((c) => c.id === clientId)

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 print:hidden">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo reporte</h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => s < step && setStep(s)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  s === step
                    ? 'bg-[#2563eb] text-white'
                    : s < step
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </button>
              <span
                className={`text-sm font-medium ${
                  s === step ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {s === 1 ? 'Datos' : s === 2 ? 'Contenido' : 'Vista previa'}
              </span>
              {s < 3 && <div className="flex-1 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic data */}
        {step === 1 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de reporte
              </label>
              <div className="flex gap-3">
                {(['weekly', 'monthly', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReportType(type)}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      reportType === type
                        ? 'border-[#2563eb] bg-blue-50 text-[#2563eb]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'weekly' ? 'Semanal' : type === 'monthly' ? 'Mensual' : 'Personalizado'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titulo
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Se genera automaticamente"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (!clientId) {
                    toast({ title: 'Selecciona un cliente', variant: 'destructive' })
                    return
                  }
                  setStep(2)
                }}
                className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Content sections */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Resumen ejecutivo */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('executiveSummary')}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">Resumen ejecutivo</span>
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    sections.executiveSummary ? 'bg-[#2563eb]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                      sections.executiveSummary ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'
                    }`}
                  />
                </div>
              </button>
              {sections.executiveSummary && (
                <div className="px-6 pb-4">
                  <textarea
                    rows={4}
                    value={executiveSummary}
                    onChange={(e) => setExecutiveSummary(e.target.value)}
                    placeholder="Resumen de los puntos mas importantes del periodo..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Tareas completadas */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('completedTasks')}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">
                  Tareas completadas
                  {tasks.length > 0 && (
                    <span className="ml-2 text-xs text-slate-400">
                      ({tasks.filter((t) => t.selected).length}/{tasks.length})
                    </span>
                  )}
                </span>
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    sections.completedTasks ? 'bg-[#2563eb]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                      sections.completedTasks ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'
                    }`}
                  />
                </div>
              </button>
              {sections.completedTasks && (
                <div className="px-6 pb-4 space-y-2">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">
                      No se encontraron tareas completadas en este periodo
                    </p>
                  ) : (
                    tasks.map((task, i) => (
                      <label
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={task.selected}
                          onChange={() => toggleTask(i)}
                          className="h-4 w-4 rounded border-slate-300 text-[#2563eb] focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{task.title}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Proyectos activos */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('activeProjects')}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">Proyectos activos</span>
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    sections.activeProjects ? 'bg-[#2563eb]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                      sections.activeProjects ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'
                    }`}
                  />
                </div>
              </button>
              {sections.activeProjects && (
                <div className="px-6 pb-4 space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">
                      No hay proyectos activos
                    </p>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5"
                      >
                        <span className="text-sm text-slate-700">{proj.name}</span>
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {proj.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* KPIs */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('kpis')}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">KPIs</span>
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    sections.kpis ? 'bg-[#2563eb]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                      sections.kpis ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'
                    }`}
                  />
                </div>
              </button>
              {sections.kpis && (
                <div className="px-6 pb-4 space-y-3">
                  {kpis.map((kpi, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={kpi.label}
                        onChange={(e) => updateKpi(i, 'label', e.target.value)}
                        placeholder="Nombre del KPI"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={kpi.value}
                        onChange={(e) => updateKpi(i, 'value', e.target.value)}
                        placeholder="Valor"
                        className="w-40 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeKpi(i)}
                        className="rounded-lg p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addKpi}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:text-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Agregar KPI
                  </button>
                </div>
              )}
            </div>

            {/* Proximos pasos */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('nextSteps')}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">Proximos pasos</span>
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    sections.nextSteps ? 'bg-[#2563eb]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                      sections.nextSteps ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'
                    }`}
                  />
                </div>
              </button>
              {sections.nextSteps && (
                <div className="px-6 pb-4 space-y-3">
                  {nextSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={step.text}
                        onChange={(e) => updateNextStep(i, e.target.value)}
                        placeholder="Describir proximo paso..."
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeNextStep(i)}
                        className="rounded-lg p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addNextStep}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:text-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Agregar paso
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Vista previa
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <div className="mb-6 border-b border-slate-200 pb-6">
                <h2 className="text-xl font-bold text-slate-900">{title || 'Sin titulo'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cliente: {selectedClient?.name || '--'} | Periodo:{' '}
                  {dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : 'No definido'}
                </p>
              </div>

              {sections.executiveSummary && executiveSummary && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    Resumen Ejecutivo
                  </h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {executiveSummary}
                  </p>
                </div>
              )}

              {sections.completedTasks && tasks.some((t) => t.selected) && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    Tareas Completadas
                  </h3>
                  <ul className="space-y-1">
                    {tasks
                      .filter((t) => t.selected)
                      .map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-2 text-sm text-slate-600"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                          {t.title}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {sections.activeProjects && projects.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    Proyectos Activos
                  </h3>
                  <ul className="space-y-1">
                    {projects.map((p) => (
                      <li key={p.id} className="text-sm text-slate-600">
                        - {p.name} ({p.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sections.kpis && kpis.some((k) => k.label && k.value) && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-800 mb-2">KPIs</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {kpis
                      .filter((k) => k.label && k.value)
                      .map((k, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <p className="text-xs text-slate-500">{k.label}</p>
                          <p className="text-lg font-semibold text-slate-900">{k.value}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {sections.nextSteps && nextSteps.some((s) => s.text) && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    Proximos Pasos
                  </h3>
                  <ol className="space-y-1 list-decimal list-inside">
                    {nextSteps
                      .filter((s) => s.text)
                      .map((s, i) => (
                        <li key={i} className="text-sm text-slate-600">
                          {s.text}
                        </li>
                      ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Editar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Exportar PDF
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print template */}
      <div className="hidden print:block print-report">
        <style jsx>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-report,
            .print-report * {
              visibility: visible;
            }
            .print-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 40px;
              color: black;
              background: white;
            }
          }
        `}</style>

        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold">AgencyAI</h1>
          <p className="text-sm text-gray-600">
            Cliente: {selectedClient?.name || '--'}
          </p>
        </div>

        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Periodo: {dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : 'No definido'}
        </p>

        {sections.executiveSummary && executiveSummary && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Resumen Ejecutivo</h3>
            <p className="text-sm whitespace-pre-wrap">{executiveSummary}</p>
          </div>
        )}

        {sections.completedTasks && tasks.some((t) => t.selected) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Tareas Completadas</h3>
            <ul className="list-disc list-inside text-sm">
              {tasks
                .filter((t) => t.selected)
                .map((t) => (
                  <li key={t.id}>{t.title}</li>
                ))}
            </ul>
          </div>
        )}

        {sections.activeProjects && projects.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Proyectos Activos</h3>
            <ul className="list-disc list-inside text-sm">
              {projects.map((p) => (
                <li key={p.id}>
                  {p.name} ({p.status})
                </li>
              ))}
            </ul>
          </div>
        )}

        {sections.kpis && kpis.some((k) => k.label && k.value) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">KPIs</h3>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {kpis
                  .filter((k) => k.label && k.value)
                  .map((k, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-2 font-medium">{k.label}</td>
                      <td className="py-2 text-right">{k.value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {sections.nextSteps && nextSteps.some((s) => s.text) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Proximos Pasos</h3>
            <ol className="list-decimal list-inside text-sm">
              {nextSteps
                .filter((s) => s.text)
                .map((s, i) => (
                  <li key={i}>{s.text}</li>
                ))}
            </ol>
          </div>
        )}

        <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
          <span>Generado por AgencyAI</span>
          <span>Fecha de generacion</span>
        </div>
      </div>
    </>
  )
}
