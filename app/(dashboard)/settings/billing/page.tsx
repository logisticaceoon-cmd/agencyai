'use client'

import { useState } from 'react'
import { CreditCard, Check, Crown, Zap, Building2, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Para comenzar a explorar',
    icon: Zap,
    features: ['1 usuario', '2 clientes', 'Dashboard básico', 'Tareas y reportes'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 12,
    description: 'Para freelancers y equipos pequeños',
    icon: Building2,
    features: ['4 usuarios', '5 clientes', 'CRM de clientes', 'Tareas y proyectos', 'Reportes y minutas', 'Documentos'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    description: 'Para agencias en crecimiento',
    icon: Crown,
    highlighted: true,
    features: ['6 usuarios', '10 clientes', 'Todo Starter', 'Módulo de finanzas', 'KPIs y métricas', 'Objetivos', 'Auditorías'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 99,
    description: 'Para agencias establecidas',
    icon: Rocket,
    features: ['10 usuarios', '20 clientes', 'Todo Pro', 'Portal cliente', 'Alertas IA', 'Grabaciones', 'Invitaciones ilimitadas'],
  },
]

export default function BillingPage() {
  const [currentPlan] = useState('free')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plan y facturación</h1>
        <p className="text-sm text-slate-500 mt-1">Gestioná tu suscripción y método de pago</p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Tu plan actual</h2>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-slate-900">Plan Free</p>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  Activo
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">1 usuario, 2 clientes, dashboard básico</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">Gratis</p>
            <p className="text-xs text-slate-500">Para siempre</p>
          </div>
        </div>
      </div>

      {/* Upgrade options */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Planes disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrent = plan.id === currentPlan
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-xl border p-5 transition-all',
                  plan.highlighted
                    ? 'border-blue-400 bg-white shadow-md shadow-blue-100'
                    : isCurrent
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Popular
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center',
                    plan.highlighted ? 'bg-blue-100' : 'bg-slate-100'
                  )}>
                    <Icon className={cn('h-4 w-4', plan.highlighted ? 'text-blue-600' : 'text-slate-600')} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-bold text-slate-900">
                    {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-slate-500">/mes</span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4">{plan.description}</p>

                <ul className="space-y-2 mb-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className={cn('h-3.5 w-3.5 flex-shrink-0', plan.highlighted ? 'text-blue-600' : 'text-slate-400')} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
                  >
                    Plan actual
                  </button>
                ) : (
                  <button
                    className={cn(
                      'w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {plan.price === 0 ? 'Seleccionar' : 'Actualizar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          ¿Necesitás un plan personalizado o tenés preguntas sobre facturación?
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Escribinos a{' '}
          <a href="mailto:soporte@agencyai.com" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
            soporte@agencyai.com
          </a>
        </p>
      </div>
    </div>
  )
}
