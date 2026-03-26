'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import {
  Zap, ArrowRight, ArrowLeft, User, Briefcase, Building2, Users,
  Globe, Mail, Check, Megaphone, Palette, Code, Radio, MessageCircle,
  Video, HelpCircle, ChevronRight, Plus, Trash2, SkipForward, Sparkles,
  DollarSign, Clock, UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'agencyai_onboarding'

interface OnboardingData {
  step: number
  nombreCompleto: string
  cargo: string
  tipoAgencia: string
  cantidadPersonas: string
  cantidadClientes: string
  gestionProyectos: string
  nombreAgencia: string
  moneda: string
  timezone: string
  invites: { email: string; role: string }[]
}

const defaultData: OnboardingData = {
  step: 1,
  nombreCompleto: '',
  cargo: '',
  tipoAgencia: '',
  cantidadPersonas: '',
  cantidadClientes: '',
  gestionProyectos: '',
  nombreAgencia: '',
  moneda: 'ARS',
  timezone: 'America/Argentina/Buenos_Aires',
  invites: [{ email: '', role: 'trafficker' }],
}

const agencyTypes = [
  { id: 'marketing_digital', label: 'Marketing Digital', icon: Megaphone },
  { id: 'diseno_creatividad', label: 'Diseño y Creatividad', icon: Palette },
  { id: 'desarrollo_web', label: 'Desarrollo Web/App', icon: Code },
  { id: 'relaciones_publicas', label: 'Relaciones Públicas', icon: Radio },
  { id: 'consultoria', label: 'Consultoría', icon: Briefcase },
  { id: 'social_media', label: 'Social Media', icon: MessageCircle },
  { id: 'produccion', label: 'Producción', icon: Video },
  { id: 'otra', label: 'Otra', icon: HelpCircle },
]

const teamSizeOptions = ['Solo', '2-5', '6-20', 'Más de 20']
const clientCountOptions = ['1-5', '6-20', 'Más de 20']
const projectTools = ['Excel / Sheets', 'Trello', 'ClickUp', 'Notion', 'Sin sistema']

const timezones = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Montevideo', label: 'Montevideo (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Caracas', label: 'Caracas (GMT-4)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
  { value: 'America/Denver', label: 'Denver (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [data, setData] = useState<OnboardingData>(defaultData)
  const [loading, setLoading] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const confettiFired = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setData({ ...defaultData, ...parsed })
      }
    } catch {
      // ignore parse errors
    }
    setTimeout(() => setFadeIn(true), 100)
  }, [])

  // Save to localStorage on data change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ignore storage errors
    }
  }, [data])

  // Fire confetti on step 7
  useEffect(() => {
    if (data.step === 7 && !confettiFired.current) {
      confettiFired.current = true
      const duration = 2000
      const end = Date.now() + duration
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }
  }, [data.step])

  const update = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }))
  }, [])

  function nextStep() {
    setFadeIn(false)
    setTimeout(() => {
      update({ step: data.step + 1 })
      setFadeIn(true)
    }, 150)
  }

  function prevStep() {
    setFadeIn(false)
    setTimeout(() => {
      update({ step: data.step - 1 })
      setFadeIn(true)
    }, 150)
  }

  async function createWorkspace() {
    setLoading(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.nombreAgencia.trim(),
          slug: data.nombreAgencia
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50),
          plan: 'free',
          industry: data.tipoAgencia,
          country: '',
          onboarding: {
            fullName: data.nombreCompleto,
            role: data.cargo,
            agencyType: data.tipoAgencia,
            teamSize: data.cantidadPersonas,
            clientCount: data.cantidadClientes,
            projectTool: data.gestionProyectos,
            currency: data.moneda,
            timezone: data.timezone,
            invites: data.invites.filter((i) => i.email.trim()),
          },
        }),
      })
      if (!res.ok) {
        setLoading(false)
        return
      }
      localStorage.removeItem(STORAGE_KEY)
      nextStep()
    } catch {
      // error handling
    } finally {
      setLoading(false)
    }
  }

  function goToDashboard() {
    localStorage.removeItem(STORAGE_KEY)
    router.push('/dashboard')
    router.refresh()
  }

  function addInvite() {
    if (data.invites.length >= 3) return
    update({ invites: [...data.invites, { email: '', role: 'trafficker' }] })
  }

  function removeInvite(index: number) {
    update({ invites: data.invites.filter((_, i) => i !== index) })
  }

  function updateInvite(index: number, field: 'email' | 'role', value: string) {
    const newInvites = [...data.invites]
    newInvites[index] = { ...newInvites[index], [field]: value }
    update({ invites: newInvites })
  }

  const stepLabels = [
    'Bienvenida',
    'Perfil',
    'Tipo agencia',
    'Equipo',
    'Workspace',
    'Invitar',
    'Listo',
  ]

  const canProceed = () => {
    switch (data.step) {
      case 2: return data.nombreCompleto.trim() && data.cargo
      case 3: return !!data.tipoAgencia
      case 4: return data.cantidadPersonas && data.cantidadClientes && data.gestionProyectos
      case 5: return data.nombreAgencia.trim()
      default: return true
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">AgencyAI</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Paso {data.step} de 7</span>
            <span className="text-xs font-medium text-slate-400">{stepLabels[data.step - 1]}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${(data.step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          className={cn(
            'rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300',
            fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
        >
          {/* ─── Step 1: Welcome ─── */}
          {data.step === 1 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 mb-6">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                ¡Bienvenido a AgencyAI!
              </h1>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Vamos a configurar tu workspace en unos minutos. Gestioná clientes, proyectos, finanzas y equipo desde un solo lugar.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8 text-left max-w-sm mx-auto">
                {[
                  { icon: Users, text: 'Gestiona tu equipo' },
                  { icon: Briefcase, text: 'Administra clientes' },
                  { icon: DollarSign, text: 'Controla finanzas' },
                  { icon: Globe, text: 'Portal para clientes' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <Icon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Empezar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── Step 2: Profile ─── */}
          {data.step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tu perfil</h2>
                  <p className="text-sm text-slate-500">Contanos un poco sobre vos</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.nombreCompleto}
                    onChange={(e) => update({ nombreCompleto: e.target.value })}
                    placeholder="Tu nombre completo"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cargo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.cargo}
                    onChange={(e) => update({ cargo: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="">Seleccionar cargo...</option>
                    <option value="dueno">Dueño/a</option>
                    <option value="director">Director/a</option>
                    <option value="manager">Manager</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Agency Type ─── */}
          {data.step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tipo de agencia</h2>
                  <p className="text-sm text-slate-500">¿A qué se dedica tu agencia?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {agencyTypes.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update({ tipoAgencia: id })}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all',
                      data.tipoAgencia === id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      data.tipoAgencia === id ? 'bg-blue-100' : 'bg-slate-100'
                    )}>
                      <Icon className={cn('h-5 w-5', data.tipoAgencia === id ? 'text-blue-600' : 'text-slate-500')} />
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      data.tipoAgencia === id ? 'text-blue-700' : 'text-slate-600'
                    )}>
                      {label}
                    </span>
                    {data.tipoAgencia === id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 4: Team context ─── */}
          {data.step === 4 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tu equipo y contexto</h2>
                  <p className="text-sm text-slate-500">Nos ayuda a personalizar tu experiencia</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Team size */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ¿Cuántas personas hay en tu equipo?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {teamSizeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ cantidadPersonas: opt })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          data.cantidadPersonas === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client count */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ¿Cuántos clientes gestionás?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {clientCountOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ cantidadClientes: opt })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          data.cantidadClientes === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project management tool */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ¿Cómo gestionás tus proyectos hoy?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {projectTools.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ gestionProyectos: opt })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          data.gestionProyectos === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 5: Workspace ─── */}
          {data.step === 5 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tu workspace</h2>
                  <p className="text-sm text-slate-500">Configurá los datos de tu agencia</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre de la agencia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.nombreAgencia}
                    onChange={(e) => update({ nombreAgencia: e.target.value })}
                    placeholder="Mi Agencia Digital"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        Moneda
                      </span>
                    </label>
                    <select
                      value={data.moneda}
                      onChange={(e) => update({ moneda: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="ARS">ARS - Peso Argentino</option>
                      <option value="USD">USD - Dólar Estadounidense</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="BRL">BRL - Real Brasileño</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Zona horaria
                      </span>
                    </label>
                    <select
                      value={data.timezone}
                      onChange={(e) => update({ timezone: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 6: Invite team ─── */}
          {data.step === 6 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Invitá a tu equipo</h2>
                  <p className="text-sm text-slate-500">Opcional — podés hacerlo después</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {data.invites.map((invite, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => updateInvite(i, 'email', e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <select
                      value={invite.role}
                      onChange={(e) => updateInvite(i, 'role', e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="admin">Admin</option>
                      <option value="trafficker">Trafficker</option>
                      <option value="client">Cliente</option>
                    </select>
                    {data.invites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInvite(i)}
                        className="rounded-lg border border-slate-200 px-2.5 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {data.invites.length < 3 && (
                <button
                  type="button"
                  onClick={addInvite}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mb-6"
                >
                  <Plus className="h-4 w-4" />
                  Agregar otra invitación
                </button>
              )}

              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs text-slate-500 text-center">
                  Las invitaciones se enviarán una vez creado el workspace. También podés invitar miembros después desde Configuración.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 7: Done ─── */}
          {data.step === 7 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-50 border border-green-200 mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Todo listo!</h2>
              <p className="text-slate-500 mb-2">
                Tu workspace <span className="font-semibold text-slate-900">{data.nombreAgencia}</span> fue creado exitosamente.
              </p>
              <p className="text-sm text-slate-400 mb-8">
                Ya podés empezar a gestionar tu agencia desde el dashboard.
              </p>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 text-left max-w-md mx-auto">
                {[
                  { label: 'Agencia', value: data.nombreAgencia },
                  { label: 'Tipo', value: agencyTypes.find((a) => a.id === data.tipoAgencia)?.label || '-' },
                  { label: 'Moneda', value: data.moneda },
                  { label: 'Equipo', value: data.cantidadPersonas },
                  { label: 'Clientes', value: data.cantidadClientes },
                  { label: 'Invitados', value: `${data.invites.filter((i) => i.email.trim()).length} personas` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={goToDashboard}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Ir al Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation buttons (steps 2-6) */}
          {data.step >= 2 && data.step <= 6 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-8 py-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </button>

              <div className="flex items-center gap-3">
                {data.step === 6 && (
                  <button
                    type="button"
                    onClick={createWorkspace}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <SkipForward className="h-4 w-4" />
                    Saltar este paso
                  </button>
                )}
                <button
                  type="button"
                  onClick={data.step === 6 ? createWorkspace : nextStep}
                  disabled={(data.step === 6 && loading) || !canProceed()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {data.step === 6
                    ? loading
                      ? 'Creando workspace...'
                      : 'Crear workspace'
                    : 'Siguiente'
                  }
                  {!loading && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
