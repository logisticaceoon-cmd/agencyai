'use client'

import Link from 'next/link'
import { Check, X as XIcon, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0,
    color: 'border-slate-200', bg: 'bg-white',
    cta: 'Empezar gratis', ctaStyle: 'bg-slate-900 hover:bg-slate-800 text-white',
    features: [
      { text: 'Owner + 1 usuario', included: true },
      { text: 'Hasta 3 clientes', included: true },
      { text: 'Proyectos y tareas', included: true },
      { text: 'Gestión de clientes', included: true },
      { text: 'Finanzas completas', included: false },
      { text: 'Agentes IA', included: false },
      { text: 'KPIs y OKRs', included: false },
      { text: 'Portal del cliente', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 29,
    color: 'border-blue-500 ring-2 ring-blue-500/20', bg: 'bg-white',
    badge: 'Más popular',
    cta: 'Empezar Pro', ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
    features: [
      { text: 'Owner + 3 usuarios', included: true },
      { text: 'Hasta 8 clientes', included: true },
      { text: 'Proyectos ilimitados', included: true },
      { text: 'Finanzas completas', included: true },
      { text: 'Agentes IA', included: true },
      { text: 'KPIs y OKRs', included: true },
      { text: 'Reportes PDF', included: true },
      { text: 'Portal del cliente', included: false },
    ],
  },
  {
    id: 'agency', name: 'Agency', price: 59,
    color: 'border-violet-500 ring-2 ring-violet-500/20', bg: 'bg-white',
    badge: 'Para agencias',
    cta: 'Empezar Agency', ctaStyle: 'bg-violet-600 hover:bg-violet-700 text-white',
    features: [
      { text: 'Owner + 10 usuarios', included: true },
      { text: 'Hasta 20 clientes', included: true },
      { text: 'Todo lo de Pro', included: true },
      { text: 'Portal del cliente', included: true },
      { text: 'Acceso API (Cowork)', included: true },
      { text: 'Grabaciones', included: true },
      { text: 'Auditorías', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
  },
  {
    id: 'scale', name: 'Scale', price: 99,
    color: 'border-slate-900', bg: 'bg-slate-900',
    cta: 'Empezar Scale', ctaStyle: 'bg-white hover:bg-slate-100 text-slate-900',
    dark: true,
    features: [
      { text: 'Usuarios ilimitados', included: true },
      { text: 'Clientes ilimitados', included: true },
      { text: 'Todo lo de Agency', included: true },
      { text: 'Onboarding personalizado', included: true },
      { text: 'Reportes white-label', included: true },
      { text: 'SLA garantizado', included: true },
      { text: 'Soporte dedicado', included: true },
      { text: 'Múltiples workspaces', included: true },
    ],
  },
]

const FEATURES_TABLE = [
  { name: 'Usuarios',        free: 'Owner + 1', pro: 'Owner + 3', agency: 'Owner + 10', scale: 'Ilimitados' },
  { name: 'Clientes',        free: '3',         pro: '8',         agency: '20',          scale: 'Ilimitados' },
  { name: 'Proyectos',       free: '10',        pro: 'Ilimitados', agency: 'Ilimitados', scale: 'Ilimitados' },
  { name: 'Tareas',          free: 'Ilimitadas', pro: 'Ilimitadas', agency: 'Ilimitadas', scale: 'Ilimitadas' },
  { name: 'Agentes IA',      free: false, pro: true,  agency: true,  scale: true  },
  { name: 'KPIs y OKRs',     free: false, pro: true,  agency: true,  scale: true  },
  { name: 'Finanzas',        free: false, pro: true,  agency: true,  scale: true  },
  { name: 'Reportes PDF',    free: false, pro: true,  agency: true,  scale: true  },
  { name: 'Portal cliente',  free: false, pro: false, agency: true,  scale: true  },
  { name: 'API Cowork',      free: false, pro: false, agency: true,  scale: true  },
  { name: 'Grabaciones',     free: false, pro: false, agency: true,  scale: true  },
  { name: 'Soporte',         free: 'Comunidad', pro: 'Email', agency: 'Prioritario', scale: 'Dedicado' },
]

const FAQ = [
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí, podés hacer upgrade o downgrade cuando quieras. Los cambios se aplican inmediatamente y se prorratea el cobro.' },
  { q: '¿Qué pasa con mis datos si hago downgrade?', a: 'Tus datos se mantienen, pero no podrás acceder a funcionalidades del plan superior hasta que hagas upgrade de nuevo.' },
  { q: '¿Ofrecen descuento anual?', a: 'Sí, los planes anuales tienen un 20% de descuento. Contactanos para más información.' },
  { q: '¿Puedo probar el plan Pro gratis?', a: 'Sí, ofrecemos 14 días de prueba gratis del plan Pro. No se requiere tarjeta de crédito.' },
  { q: '¿Cómo funciona el límite de usuarios?', a: 'El límite incluye al dueño de la cuenta. Por ejemplo, el plan Pro (owner + 3) permite 4 personas en total: el dueño más 3 miembros del equipo.' },
]

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSelectPlan(planId: string) {
    if (planId === 'free') {
      window.location.href = '/sign-up'
      return
    }
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">AgencyAI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-slate-600 hover:text-slate-900">Iniciar sesión</Link>
          <Link href="/sign-up" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Registrarse</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Planes y precios</h1>
          <p className="text-lg text-slate-500 mt-3">Elegí el plan que mejor se adapte a tu agencia</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {PLANS.map(plan => (
            <div key={plan.id} className={cn('rounded-2xl border-2 p-6 relative flex flex-col', plan.color, plan.bg)}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={cn(
                    'text-white text-xs font-semibold px-4 py-1 rounded-full',
                    plan.id === 'agency' ? 'bg-violet-600' : 'bg-blue-600'
                  )}>{plan.badge}</span>
                </div>
              )}
              <h3 className={cn('text-xl font-bold', plan.dark ? 'text-white' : 'text-slate-900')}>{plan.name}</h3>
              <div className="mt-3 mb-5">
                <span className={cn('text-4xl font-bold', plan.dark ? 'text-white' : 'text-slate-900')}>${plan.price}</span>
                <span className={cn('text-sm ml-1', plan.dark ? 'text-slate-400' : 'text-slate-500')}>/mes</span>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {f.included ? (
                      <Check className={cn('h-4 w-4 flex-shrink-0', plan.dark ? 'text-green-400' : 'text-green-500')} />
                    ) : (
                      <XIcon className={cn('h-4 w-4 flex-shrink-0', plan.dark ? 'text-slate-600' : 'text-slate-300')} />
                    )}
                    <span className={cn('text-sm', plan.dark
                      ? (f.included ? 'text-slate-300' : 'text-slate-600')
                      : (f.included ? 'text-slate-700' : 'text-slate-400')
                    )}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={cn('w-full py-2.5 rounded-xl font-medium text-sm transition-colors', plan.ctaStyle)}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Features comparison */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Comparación detallada</h2>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-900">Funcionalidad</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-500">Free</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-blue-600">Pro</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-violet-600">Agency</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-900">Scale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FEATURES_TABLE.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-700">{f.name}</td>
                    {(['free', 'pro', 'agency', 'scale'] as const).map(plan => (
                      <td key={plan} className="px-4 py-3 text-center">
                        {typeof f[plan] === 'boolean' ? (
                          f[plan]
                            ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                            : <XIcon className="h-4 w-4 text-slate-300 mx-auto" />
                        ) : (
                          <span className="text-sm text-slate-600">{f[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">{faq.q}</span>
                  <span className="text-slate-400">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4"><p className="text-sm text-slate-500">{faq.a}</p></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
