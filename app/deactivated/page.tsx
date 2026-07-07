'use client'

import { useState } from 'react'
import { XCircle, RefreshCw, Loader2, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function DeactivatedPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleReactivate() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/account/reactivate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        // Redirigir al dashboard después de reactivar
        setTimeout(() => { window.location.href = '/dashboard' }, 1500)
      } else {
        setMessage({ type: 'error', text: data.error || 'No se pudo reactivar la cuenta' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-8 text-center">

        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Cuenta desactivada</h1>
        <p className="text-slate-500 text-sm mb-6">
          Tu cuenta está temporalmente suspendida. Tus datos están seguros y se conservarán por
          90 días desde la fecha de desactivación.
        </p>

        {message && (
          <div className={`rounded-xl p-4 mb-6 text-sm text-left ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleReactivate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? 'Reactivando...' : 'Reactivar mi cuenta'}
          </button>

          <Link
            href="/settings/billing"
            className="block w-full px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Ver opciones de suscripción
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-slate-500 text-sm hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          ¿Necesitás ayuda? Contactanos en{' '}
          <a href="mailto:soporte@agencyai.app" className="text-blue-500 hover:underline">
            soporte@agencyai.app
          </a>
        </p>
      </div>
    </div>
  )
}
