'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/hooks/use-toast'
import {
  Brain, Zap, Lightbulb, Cog, Sparkles,
  Save, CheckCircle2, Key, ChevronRight,
  LayoutDashboard, Users, FolderKanban, ListTodo, FileText,
  DollarSign, BarChart3, Goal, Bell, Clock, TrendingDown, Mail, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIConfig {
  agent_name: string
  agent_avatar: string
  agent_personality: string
  ai_provider: string
  anthropic_api_key: string
  openai_api_key: string
  language: string
}

const AVATARS = [
  { emoji: '\u{1F916}', label: 'Robot' },
  { emoji: '\u{1F9E0}', label: 'Cerebro' },
  { emoji: '\u26A1', label: 'Rayo' },
  { emoji: '\u{1F3AF}', label: 'Diana' },
  { emoji: '\u{1F4A1}', label: 'Idea' },
  { emoji: '\u{1F680}', label: 'Cohete' },
  { emoji: '\u{1F9BE}', label: 'Brazo' },
  { emoji: '\u2728', label: 'Brillos' },
]

const PERSONALITIES = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'amigable', label: 'Amigable' },
  { value: 'directo', label: 'Directo' },
  { value: 'motivacional', label: 'Motivacional' },
  { value: 'analitico', label: 'Analitico' },
]

const LANGUAGES = [
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Portugues' },
]

const TUTORIAL_STEPS = [
  { step: 1, title: 'Elegi tu motor de IA', description: 'Selecciona entre Claude (Anthropic) o ChatGPT (OpenAI) como tu proveedor de IA.' },
  { step: 2, title: 'Consigui tu API Key', description: 'Para Claude: visita console.anthropic.com/settings/keys. Para OpenAI: visita platform.openai.com/api-keys.' },
  { step: 3, title: 'Pega la key en el campo', description: 'Copia la API key generada y pegala en el campo correspondiente del proveedor que elegiste.' },
  { step: 4, title: 'Listo! Tu agente esta activo', description: 'El agente de IA esta configurado y listo para ayudarte en todos los modulos de la plataforma.' },
]

const AI_MODULES = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Users, label: 'Clientes' },
  { icon: FolderKanban, label: 'Proyectos' },
  { icon: ListTodo, label: 'Tareas' },
  { icon: FileText, label: 'Reportes' },
  { icon: DollarSign, label: 'Finanzas' },
  { icon: BarChart3, label: 'KPIs' },
  { icon: Goal, label: 'Objetivos' },
]

const AUTO_ALERTS = [
  { key: 'task_overdue', icon: Clock, label: 'Notificarme cuando una tarea vence sin completarse' },
  { key: 'objective_stalled', icon: AlertTriangle, label: 'Alertar si un microobjetivo lleva 2+ dias sin avance' },
  { key: 'client_inactive', icon: Users, label: 'Avisar cuando un cliente no tuvo actividad en 2 semanas' },
  { key: 'weekly_summary', icon: Mail, label: 'Resumen semanal automatico cada lunes' },
  { key: 'kpi_drop', icon: TrendingDown, label: 'Alerta si un KPI cae mas del 20% vs periodo anterior' },
]

const defaultConfig: AIConfig = {
  agent_name: 'Asistente AgencyAI',
  agent_avatar: '\u{1F916}',
  agent_personality: 'profesional',
  ai_provider: '',
  anthropic_api_key: '',
  openai_api_key: '',
  language: 'es',
}

export default function AIAgentPage() {
  const { org } = useAuthStore()
  const [config, setConfig] = useState<AIConfig>({ ...defaultConfig })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    task_overdue: true,
    objective_stalled: false,
    client_inactive: true,
    weekly_summary: false,
    kpi_drop: true,
  })

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/ai/config')
        if (res.ok) {
          const json = await res.json()
          if (json.data) {
            setConfig({
              agent_name: json.data.agent_name || defaultConfig.agent_name,
              agent_avatar: json.data.agent_avatar || defaultConfig.agent_avatar,
              agent_personality: json.data.agent_personality || defaultConfig.agent_personality,
              ai_provider: json.data.ai_provider || '',
              anthropic_api_key: json.data.anthropic_api_key || '',
              openai_api_key: json.data.openai_api_key || '',
              language: json.data.language || 'es',
            })
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  async function saveConfig() {
    setSaving(true)
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast({ title: 'Configuracion guardada' })
      } else {
        toast({ title: 'Error al guardar', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function verifyKey(provider: string) {
    setVerifying(provider)
    // Simulate verification
    await new Promise(r => setTimeout(r, 1500))
    const key = provider === 'anthropic' ? config.anthropic_api_key : config.openai_api_key
    if (key && key.length > 10) {
      toast({ title: `API key de ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} verificada` })
    } else {
      toast({ title: 'API key invalida o vacia', variant: 'destructive' })
    }
    setVerifying(null)
  }

  function toggleAlert(key: string) {
    setAlerts(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function maskKey(key: string) {
    if (!key || key.length < 8) return key
    return key.slice(0, 4) + '...' + key.slice(-4)
  }

  if (!org) return null

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agente de IA"
        description="Configura tu asistente inteligente y sus integraciones"
        action={
          <button
            onClick={saveConfig}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            <Save size={16} strokeWidth={1.5} />
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* SECTION 1 - Agent Config */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Cog size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Configuracion del agente</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Nombre del agente</label>
                <input
                  value={config.agent_name}
                  onChange={(e) => setConfig(p => ({ ...p, agent_name: e.target.value }))}
                  placeholder="Asistente AgencyAI"
                  className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a.emoji}
                      type="button"
                      onClick={() => setConfig(p => ({ ...p, agent_avatar: a.emoji }))}
                      className={cn(
                        'w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl transition-all',
                        config.agent_avatar === a.emoji
                          ? 'border-[var(--blue)] bg-[var(--blue-light)] shadow-sm'
                          : 'border-[var(--border-base)] hover:border-[var(--blue)] hover:bg-[var(--bg-subtle)]'
                      )}
                      title={a.label}
                    >
                      {a.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Personalidad</label>
                  <select
                    value={config.agent_personality}
                    onChange={(e) => setConfig(p => ({ ...p, agent_personality: e.target.value }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  >
                    {PERSONALITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Idioma</label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig(p => ({ ...p, language: e.target.value }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 - AI Provider */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Key size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Proveedor de IA</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Claude Card */}
              <div
                onClick={() => setConfig(p => ({ ...p, ai_provider: 'anthropic' }))}
                className={cn(
                  'rounded-xl border-2 p-5 cursor-pointer transition-all',
                  config.ai_provider === 'anthropic'
                    ? 'border-[var(--blue)] bg-[var(--blue-light)]'
                    : 'border-[var(--border-base)] hover:border-[var(--blue)]'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-orange-50 p-2">
                      <Sparkles size={16} strokeWidth={1.5} className="text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Claude</h3>
                      <p className="text-xs text-[var(--text-muted)]">Anthropic</p>
                    </div>
                  </div>
                  {config.ai_provider === 'anthropic' && (
                    <CheckCircle2 size={20} strokeWidth={1.5} className="text-[var(--blue)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  IA avanzada con capacidades de razonamiento y analisis profundo. Ideal para tareas complejas y generacion de contenido.
                </p>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={config.anthropic_api_key}
                    onChange={(e) => setConfig(p => ({ ...p, anthropic_api_key: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="sk-ant-..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); verifyKey('anthropic') }}
                    disabled={verifying === 'anthropic' || !config.anthropic_api_key}
                    className="text-xs font-medium text-[var(--blue)] hover:opacity-80 disabled:opacity-40 transition-colors"
                  >
                    {verifying === 'anthropic' ? 'Verificando...' : 'Verificar key'}
                  </button>
                </div>
              </div>

              {/* OpenAI Card */}
              <div
                onClick={() => setConfig(p => ({ ...p, ai_provider: 'openai' }))}
                className={cn(
                  'rounded-xl border-2 p-5 cursor-pointer transition-all',
                  config.ai_provider === 'openai'
                    ? 'border-[var(--blue)] bg-[var(--blue-light)]'
                    : 'border-[var(--border-base)] hover:border-[var(--blue)]'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <Brain size={16} strokeWidth={1.5} className="text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">ChatGPT</h3>
                      <p className="text-xs text-[var(--text-muted)]">OpenAI</p>
                    </div>
                  </div>
                  {config.ai_provider === 'openai' && (
                    <CheckCircle2 size={20} strokeWidth={1.5} className="text-[var(--blue)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  Motor de IA versatil y rapido. Excelente para conversaciones, resumen de datos y automatizacion de flujos de trabajo.
                </p>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={config.openai_api_key}
                    onChange={(e) => setConfig(p => ({ ...p, openai_api_key: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="sk-..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); verifyKey('openai') }}
                    disabled={verifying === 'openai' || !config.openai_api_key}
                    className="text-xs font-medium text-[var(--blue)] hover:opacity-80 disabled:opacity-40 transition-colors"
                  >
                    {verifying === 'openai' ? 'Verificando...' : 'Verificar key'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3 - Tutorial Stepper */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Como configurar tu agente</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {TUTORIAL_STEPS.map((step, i) => (
                <div key={step.step} className="relative">
                  <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-subtle)] p-4 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--blue)] text-white text-xs font-bold">
                        {step.step}
                      </span>
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">{step.title}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{step.description}</p>
                  </div>
                  {i < TUTORIAL_STEPS.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                      <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4 - Modules with AI */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Modulos con IA</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AI_MODULES.map(mod => {
                const Icon = mod.icon
                return (
                  <div key={mod.label} className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-subtle)] p-4 flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 border border-[var(--border-base)]">
                      <Icon size={16} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{mod.label}</p>
                    </div>
                    <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-500 flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION 5 - Auto Alerts */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Alertas automaticas</h2>
            </div>

            <div className="space-y-1">
              {AUTO_ALERTS.map(alert => {
                const Icon = alert.icon
                const isActive = alerts[alert.key]
                return (
                  <div
                    key={alert.key}
                    className="flex items-center gap-4 rounded-lg px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Icon size={16} strokeWidth={1.5} className="text-[var(--text-muted)] flex-shrink-0" />
                    <span className="flex-1 text-sm text-[var(--text-primary)]">{alert.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleAlert(alert.key)}
                      className={cn(
                        'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                        isActive ? 'bg-[var(--blue)]' : 'bg-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                          isActive && 'translate-x-5'
                        )}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
