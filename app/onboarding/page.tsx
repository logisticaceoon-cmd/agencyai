'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { generateSlug, PLANS } from '@/lib/plans'
import {
  Zap, Building2, Check, ArrowRight, Users, Briefcase,
  Globe, DollarSign, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [industry, setIndustry] = useState('')
  const [country, setCountry] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'pro' | 'agency' | 'scale'>('free')
  const [orgId, setOrgId] = useState('')

  function handleNameChange(val: string) {
    setOrgName(val)
    setOrgSlug(generateSlug(val))
  }

  async function createOrganization() {
    if (!orgName.trim()) {
      toast({ title: 'Ingresá el nombre de tu organización', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          slug: orgSlug,
          plan: selectedPlan,
          industry,
          country,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: 'Error al crear organización', description: err.error, variant: 'destructive' })
        return
      }
      const { data } = await res.json()
      setOrgId(data.id)
      setStep(3)
    } catch {
      toast({ title: 'Error inesperado', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function finish() {
    router.push('/dashboard')
    router.refresh()
  }

  const industries = [
    'Agencia Digital', 'Marketing', 'E-commerce', 'SaaS', 'Retail',
    'Real Estate', 'Salud', 'Educación', 'Consultoría', 'Otro'
  ]

  const stepConfig = [
    { num: 1, label: 'Bienvenida' },
    { num: 2, label: 'Tu empresa' },
    { num: 3, label: 'Listo' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">AgencyAI</span>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepConfig.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                step > s.num
                  ? 'bg-indigo-600 text-white'
                  : step === s.num
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
                  : 'bg-zinc-800 text-zinc-500'
              )}>
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block',
                step >= s.num ? 'text-white' : 'text-zinc-500'
              )}>{s.label}</span>
              {i < stepConfig.length - 1 && (
                <ChevronRight className="h-4 w-4 text-zinc-700 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-6">
                <Zap className="h-8 w-8 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">¡Bienvenido a AgencyAI!</h1>
              <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                El sistema de gestión todo-en-uno para agencias, traffickers y freelancers de marketing digital.
                En 2 minutos tendrás tu workspace listo.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8 text-left max-w-sm mx-auto">
                {[
                  { icon: Users, text: 'Gestiona tu equipo' },
                  { icon: Briefcase, text: 'Administra clientes' },
                  { icon: DollarSign, text: 'Controla finanzas' },
                  { icon: Globe, text: 'Portal para clientes' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 rounded-lg bg-zinc-800/60 px-3 py-2.5">
                    <Icon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 mx-auto rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Comenzar configuración <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Org details */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Creá tu workspace</h2>
                  <p className="text-sm text-zinc-500">Configurá los datos de tu empresa u organización</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Nombre de la empresa / organización <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Mi Agencia Digital"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  {orgSlug && (
                    <p className="mt-1 text-xs text-zinc-500">
                      URL: agencyai.com/<span className="text-indigo-400">{orgSlug}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Industria</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="">Seleccionar...</option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">País</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Argentina"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Plan selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-3">Elegí tu plan</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.slice(0, 3).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={cn(
                        'relative rounded-xl border p-4 text-left transition-all',
                        selectedPlan === plan.id
                          ? 'border-indigo-500 bg-indigo-600/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      )}
                    >
                      {plan.highlighted && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                          Popular
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">{plan.name}</span>
                        {selectedPlan === plan.id && (
                          <Check className="h-4 w-4 text-indigo-400" />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                        {plan.price > 0 && <span className="text-sm font-normal text-zinc-500">/mes</span>}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {plan.maxUsers} usuario{plan.maxUsers > 1 ? 's' : ''} · {plan.maxClients} clientes
                      </p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-600 text-center">
                  Podés cambiar el plan en cualquier momento desde configuración
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={createOrganization}
                  disabled={loading || !orgName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creando workspace...' : (
                    <><span>Crear workspace</span> <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">¡Workspace listo!</h2>
              <p className="text-zinc-400 mb-2">
                <span className="text-white font-medium">{orgName}</span> está configurado y listo para usar.
              </p>
              <p className="text-zinc-500 text-sm mb-8">
                Podés invitar a tu equipo, crear tu primer cliente y empezar a gestionar tus proyectos.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: 'Invitar equipo', href: '/settings', icon: Users },
                  { label: 'Crear cliente', href: '/clients', icon: Briefcase },
                  { label: 'Nueva tarea', href: '/tasks', icon: Check },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-center">
                    <Icon className="h-5 w-5 text-indigo-400 mx-auto mb-1.5" />
                    <p className="text-xs text-zinc-400">{label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={finish}
                className="flex items-center gap-2 mx-auto rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Ir al dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
