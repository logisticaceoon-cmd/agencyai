'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase'
import {
  Zap, ArrowRight, ArrowLeft, User, Briefcase, Building2, Users,
  Globe, Mail, Check, Megaphone, Palette, Code, Radio, MessageCircle,
  Video, HelpCircle, ChevronRight, Plus, Trash2, SkipForward, Sparkles,
  DollarSign, Clock, UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROFESSIONAL_TYPES } from '@/lib/professional-types'

const STORAGE_KEY = 'agencyai_onboarding'

interface OnboardingData {
  step: number
  mode: '' | 'create' | 'join'
  joinCode: string
  fullName: string
  cargo: string
  agencyType: string
  teamSize: string
  clientCount: string
  projectTool: string
  workspaceName: string
  currency: string
  timezone: string
  customType: string
  invites: { email: string; role: string }[]
}

const defaultData: OnboardingData = {
  step: 1,
  mode: '',
  joinCode: '',
  fullName: '',
  cargo: '',
  agencyType: '',
  teamSize: '',
  clientCount: '',
  projectTool: '',
  workspaceName: '',
  currency: 'ARS',
  timezone: 'America/Argentina/Buenos_Aires',
  customType: '',
  invites: [{ email: '', role: 'admin' }],
}

const teamSizeOptions = ['Solo', '2-5', '6-20', 'Mas de 20']
const clientCountOptions = ['1-5', '6-20', 'Mas de 20']
const projectTools = ['Excel / Sheets', 'Trello', 'ClickUp', 'Notion', 'Sin sistema']

const timezones = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo (GMT-3)' },
  { value: 'America/Montevideo', label: 'Montevideo (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Caracas', label: 'Caracas (GMT-4)' },
  { value: 'America/Bogota', label: 'Bogota (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de Mexico (GMT-6)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
  { value: 'America/Denver', label: 'Denver (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
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

  // Fire confetti on step 8
  useEffect(() => {
    if (data.step === 8 && !confettiFired.current) {
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
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!user || userError) {
        console.error('No authenticated user found:', userError)
        alert('Error: No hay sesion activa. Por favor inicia sesion nuevamente.')
        router.push('/sign-in')
        setLoading(false)
        return
      }

      // Check if workspace already exists for this user
      const { data: existing } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (existing) {
        localStorage.setItem('agencyai_workspace_id', existing.id)
      } else {
        // Create workspace
        const slug = (data.workspaceName || user.email?.split('@')[0] || 'agency')
          .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50) + '-' + Date.now()

        const { data: workspace, error } = await supabase.from('workspaces').insert({
          name: data.workspaceName || user.email?.split('@')[0] + ' Agency',
          slug,
          currency: data.currency || 'USD',
          timezone: data.timezone || 'America/Argentina/Buenos_Aires',
          agency_type: data.agencyType || 'marketing',
          plan: 'free',
          owner_id: user.id,
        }).select().single()

        if (error) {
          console.error('Error creating workspace:', JSON.stringify(error))
          alert('Error al crear workspace: ' + error.message)
          setLoading(false)
          return
        }

        // Create workspace member for owner
        await supabase.from('workspace_members').insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
          email: user.email,
          name: data.fullName,
          status: 'active',
        })

        await supabase.from('workspaces').update({
          professional_type_id: data.agencyType || 'marketing_agency',
          professional_type_custom: data.customType || null,
          onboarding_completed: true,
        }).eq('id', workspace.id)

        localStorage.setItem('agencyai_workspace_id', workspace.id)

        // Send invites via the team API (generates real tokens + sends emails)
        for (const invite of data.invites) {
          if (invite.email.trim()) {
            try {
              await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: invite.email, role: invite.role }),
              })
            } catch {
              // Non-blocking — invites can be sent later from Settings
            }
          }
        }
      }

      localStorage.removeItem(STORAGE_KEY)
      setFadeIn(false)
      setTimeout(() => {
        update({ step: 8 })
        setFadeIn(true)
      }, 150)
    } catch (err) {
      console.error('Error during workspace creation:', err)
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
    update({ invites: [...data.invites, { email: '', role: 'admin' }] })
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
    'Inicio',
    'Bienvenida',
    'Perfil',
    'Tipo agencia',
    'Equipo',
    'Workspace',
    'Invitar',
    'Listo',
  ]

  const totalSteps = 8

  const canProceed = () => {
    switch (data.step) {
      case 1: return data.mode === 'create'
      case 3: return !!(data.fullName.trim() && data.cargo)
      case 4: return !!data.agencyType
      case 5: return !!(data.teamSize && data.clientCount && data.projectTool)
      case 6: return !!data.workspaceName.trim()
      default: return true
    }
  }

  function handleJoinRedirect() {
    const code = data.joinCode.trim()
    if (!code) return
    // Accept full URL or just the token
    const token = code.includes('/invite/') ? code.split('/invite/')[1].split('?')[0] : code
    router.push(`/invite/${token}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center p-4">
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
            <span className="text-xs font-medium text-slate-500">Paso {data.step} de {totalSteps}</span>
            <span className="text-xs font-medium text-slate-400">{stepLabels[data.step - 1]}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${(data.step / totalSteps) * 100}%` }}
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
          {/* Step 1: Choose path */}
          {data.step === 1 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido a AgencyAI</h1>
                <p className="text-slate-500 text-sm">¿Qué querés hacer?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Option A: Crear */}
                <button
                  type="button"
                  onClick={() => { update({ mode: 'create', joinCode: '' }); setTimeout(nextStep, 80) }}
                  className={cn(
                    'flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all hover:shadow-md',
                    data.mode === 'create'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  )}
                >
                  <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Crear mi agencia</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Configuro un nuevo workspace para mi equipo desde cero
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['Clientes', 'Proyectos', 'Finanzas', 'Equipo'].map((f) => (
                      <span key={f} className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{f}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm mt-auto">
                    Empezar <ArrowRight className="h-4 w-4" />
                  </div>
                </button>

                {/* Option B: Join */}
                <button
                  type="button"
                  onClick={() => update({ mode: 'join', joinCode: '' })}
                  className={cn(
                    'flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all hover:shadow-md',
                    data.mode === 'join'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 bg-white hover:border-violet-300'
                  )}
                >
                  <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Unirme a una agencia</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Me invitaron a un workspace existente y quiero unirme
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-violet-600 font-semibold text-sm mt-auto">
                    Tengo un código de invitación <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              </div>

              {/* Join form — expands when mode === 'join' */}
              {data.mode === 'join' && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <label className="block text-sm font-semibold text-violet-900 mb-2">
                    Código o enlace de invitación
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={data.joinCode}
                      onChange={(e) => update({ joinCode: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRedirect()}
                      placeholder="https://agencyai.app/invite/... o solo el código"
                      className="flex-1 rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleJoinRedirect}
                      disabled={!data.joinCode.trim()}
                      className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
                    >
                      Ir
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-violet-600">
                    Pedile el enlace o token a quien te invitó. Si no lo tenés, pediles que te re-envíen la invitación desde Configuración → Equipo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Welcome */}
          {data.step === 2 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 mb-6">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Vamos a crear tu agencia
              </h1>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Te llevará menos de 3 minutos. Configuramos tu workspace con todo lo que necesitás para arrancar.
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

          {/* Step 3: Profile */}
          {data.step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tu perfil</h2>
                  <p className="text-sm text-slate-500">Cuéntanos un poco sobre ti</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.fullName}
                    onChange={(e) => update({ fullName: e.target.value })}
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
                    <option value="dueno">Dueno/a</option>
                    <option value="director">Director/a</option>
                    <option value="manager">Manager</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Agency Type */}
          {data.step === 4 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">¿A qué te dedicas?</h2>
                  <p className="text-sm text-slate-500">Esto personaliza todo el sistema para tu tipo de trabajo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                {PROFESSIONAL_TYPES.map((pt) => {
                  const selected = data.agencyType === pt.id
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => update({ agencyType: pt.id })}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                        selected
                          ? 'border-2 shadow-sm'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      )}
                      style={selected ? {
                        borderColor: pt.color,
                        backgroundColor: pt.color + '10',
                      } : undefined}
                    >
                      <span className="text-3xl flex-shrink-0">{pt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm font-bold', selected ? 'text-slate-900' : 'text-slate-700')}>{pt.name}</p>
                          {selected && (
                            <Check className="h-4 w-4 flex-shrink-0" style={{ color: pt.color }} />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{pt.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {data.agencyType === 'other' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">¿Cuál es tu actividad?</label>
                  <input
                    type="text"
                    value={data.customType}
                    onChange={(e) => update({ customType: e.target.value })}
                    placeholder="Describe tu tipo de servicio"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Team context */}
          {data.step === 5 && (
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cuantas personas hay en tu equipo?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {teamSizeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ teamSize: opt })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          data.teamSize === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cuantos clientes gestionas?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {clientCountOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ clientCount: opt })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          data.clientCount === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Como gestionas tus proyectos hoy?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {projectTools.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ projectTool: opt })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          data.projectTool === opt
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

          {/* Step 6: Workspace */}
          {data.step === 6 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tu workspace</h2>
                  <p className="text-sm text-slate-500">Configura los datos de tu agencia</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre de la agencia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.workspaceName}
                    onChange={(e) => update({ workspaceName: e.target.value })}
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
                      value={data.currency}
                      onChange={(e) => update({ currency: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="ARS">ARS - Peso Argentino</option>
                      <option value="USD">USD - Dolar Estadounidense</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="BRL">BRL - Real Brasileno</option>
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

          {/* Step 7: Invite team */}
          {data.step === 7 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Invita a tu equipo</h2>
                  <p className="text-sm text-slate-500">Opcional — puedes hacerlo después</p>
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
                      <option value="viewer">Viewer</option>
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
                  Las invitaciones se enviarán una vez creado el workspace. También puedes invitar miembros después desde Configuración.
                </p>
              </div>
            </div>
          )}

          {/* Step 8: Done */}
          {data.step === 8 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-50 border border-green-200 mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Todo listo!</h2>
              <p className="text-slate-500 mb-2">
                Tu workspace <span className="font-semibold text-slate-900">{data.workspaceName}</span> fue creado exitosamente.
              </p>
              <p className="text-sm text-slate-400 mb-8">
                Ya puedes empezar a gestionar tu agencia desde el dashboard.
              </p>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 text-left max-w-md mx-auto">
                {[
                  { label: 'Agencia', value: data.workspaceName },
                  { label: 'Tipo', value: PROFESSIONAL_TYPES.find((a) => a.id === data.agencyType)?.name || '-' },
                  { label: 'Moneda', value: data.currency },
                  { label: 'Equipo', value: data.teamSize },
                  { label: 'Clientes', value: data.clientCount },
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

          {/* Navigation buttons — steps 1 (only for create mode) and 3-7 */}
          {((data.step === 1 && data.mode === 'create') || (data.step >= 3 && data.step <= 7)) && (
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
                {data.step === 7 && (
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
                  onClick={data.step === 7 ? createWorkspace : nextStep}
                  disabled={(data.step === 7 && loading) || !canProceed()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {data.step === 7
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
