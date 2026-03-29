'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ExternalLink, Check } from 'lucide-react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { cn } from '@/lib/utils'

const PLAN_NAMES: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency', scale: 'Scale' }
const PLAN_PRICES: Record<string, number> = { free: 0, starter: 12, pro: 29, agency: 79, scale: 149 }

export default function BillingPage() {
  const { workspace } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)

  useEffect(() => {
    setIsMock(new URLSearchParams(window.location.search).get('mock') === 'true')
  }, [])

  const plan = workspace?.plan || 'free'
  const expiresAt = workspace?.plan_expires_at ? new Date(workspace.plan_expires_at).toLocaleDateString('es-ES') : null

  async function handleManageBilling() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(false)
  }

  async function handleUpgrade(planId: string) {
    setLoading(true)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plan y facturacion</h1>
        <p className="mt-1 text-sm text-slate-500">Gestion de tu suscripcion</p>
      </div>

      {isMock && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Modo demo activo</p>
            <p className="text-xs text-amber-600 mt-0.5">Configura Stripe para activar pagos reales. Por ahora el plan esta activo en modo demo.</p>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Plan actual: {PLAN_NAMES[plan] || plan}</h3>
              <p className="text-xs text-slate-400">${PLAN_PRICES[plan] || 0}/mes {expiresAt ? `— Renueva el ${expiresAt}` : ''}</p>
            </div>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-xs font-semibold',
            plan === 'free' ? 'bg-slate-100 text-slate-600' :
            plan === 'pro' ? 'bg-blue-50 text-blue-600' :
            plan === 'agency' ? 'bg-purple-50 text-purple-600' :
            'bg-slate-100 text-slate-600'
          )}>{PLAN_NAMES[plan]}</span>
        </div>

        {plan !== 'free' && (
          <button onClick={handleManageBilling} disabled={loading} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <ExternalLink className="h-4 w-4" /> Gestionar suscripcion
          </button>
        )}
      </div>

      {/* Upgrade options */}
      {plan === 'free' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Upgrade tu plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['pro', 'agency'].map(p => (
              <div key={p} className={cn('rounded-xl border-2 p-6', p === 'pro' ? 'border-blue-500' : 'border-slate-900')}>
                <h4 className="text-lg font-bold text-slate-900">{PLAN_NAMES[p]}</h4>
                <p className="text-2xl font-bold text-slate-900 mt-2">${PLAN_PRICES[p]}<span className="text-sm font-normal text-slate-500">/mes</span></p>
                <ul className="mt-4 space-y-2">
                  {(p === 'pro' ? ['5 usuarios', 'IA en todos los modulos', 'Finanzas y KPIs'] : ['Usuarios ilimitados', 'Portal del cliente', 'Soporte prioritario']).map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><Check className="h-4 w-4 text-green-500" />{f}</li>
                  ))}
                </ul>
                <button onClick={() => handleUpgrade(p)} disabled={loading} className={cn('w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  p === 'pro' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                )}>{loading ? 'Procesando...' : `Upgrade a ${PLAN_NAMES[p]}`}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
