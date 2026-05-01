'use client'

import { useState, useEffect } from 'react'
import { User, Camera, Globe, Bell, Save, Key, ExternalLink, Loader2, CheckCircle, AlertTriangle, XCircle, RefreshCw, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthStore } from '@/store/auth'

interface AccountStatus {
  status: 'active' | 'cancelled' | 'deactivated'
  plan: string
  deactivatedAt: string | null
  deleteAfter: string | null
  cancellationScheduledAt: string | null
  daysUntilDeletion: number | null
  hasStripe: boolean
}

export default function AccountPage() {
  const { user, isLoading } = useCurrentUser()
  const { setUser } = useAuthStore()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires')
  const [idioma, setIdioma] = useState('es')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifApp, setNotifApp] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Confirm dialogs
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  useEffect(() => {
    if (user) {
      setNombre(user.fullName || '')
      setEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    fetch('/api/account/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAccountStatus(data) })
      .catch(() => {})
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: nombre }),
      })
      if (res.ok) {
        setSaved(true)
        if (user) setUser({ ...user, fullName: nombre })
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelSubscription() {
    setActionLoading('cancel')
    setActionMessage(null)
    try {
      const res = await fetch('/api/account/cancel-subscription', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message })
        setAccountStatus(prev => prev ? { ...prev, status: 'cancelled', cancellationScheduledAt: data.periodEnd || null } : prev)
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Error al cancelar suscripción' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
      setShowCancelConfirm(false)
    }
  }

  async function handleDeactivateAccount() {
    setActionLoading('deactivate')
    setActionMessage(null)
    try {
      const res = await fetch('/api/account/deactivate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message })
        setAccountStatus(prev => prev ? { ...prev, status: 'deactivated', deleteAfter: data.deleteAfter, daysUntilDeletion: 90 } : prev)
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Error al desactivar cuenta' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
      setShowDeactivateConfirm(false)
    }
  }

  async function handleReactivate() {
    setActionLoading('reactivate')
    setActionMessage(null)
    try {
      const res = await fetch('/api/account/reactivate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message })
        setAccountStatus(prev => prev ? { ...prev, status: 'active', deactivatedAt: null, deleteAfter: null, daysUntilDeletion: null, cancellationScheduledAt: null } : prev)
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Error al reactivar cuenta' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded mt-2 animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const isDeactivated = accountStatus?.status === 'deactivated'
  const isCancelled = accountStatus?.status === 'cancelled'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>
        <p className="text-sm text-slate-500 mt-1">Gestioná tu perfil, preferencias y suscripción</p>
      </div>

      {/* Status banners */}
      {isDeactivated && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Cuenta desactivada</p>
            <p className="text-sm text-red-700 mt-0.5">
              Tu cuenta está desactivada. Tus datos se conservarán hasta el{' '}
              {accountStatus.deleteAfter ? new Date(accountStatus.deleteAfter).toLocaleDateString('es-ES') : '—'}.
              {accountStatus.daysUntilDeletion !== null && (
                <span className="font-medium"> Quedan {accountStatus.daysUntilDeletion} días.</span>
              )}
            </p>
          </div>
          <button
            onClick={handleReactivate}
            disabled={actionLoading === 'reactivate'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {actionLoading === 'reactivate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reactivar
          </button>
        </div>
      )}

      {isCancelled && accountStatus.cancellationScheduledAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Suscripción cancelada</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Tu plan actual sigue activo hasta el{' '}
              <span className="font-medium">{new Date(accountStatus.cancellationScheduledAt).toLocaleDateString('es-ES')}</span>.
              Después bajará automáticamente al plan gratuito.
            </p>
          </div>
        </div>
      )}

      {/* Action feedback */}
      {actionMessage && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          actionMessage.type === 'success'
            ? 'border-green-200 bg-green-50'
            : 'border-red-200 bg-red-50'
        }`}>
          {actionMessage.type === 'success'
            ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-sm ${actionMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {actionMessage.text}
          </p>
          <button onClick={() => setActionMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Información personal</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Foto de perfil</label>
              <div className="flex items-center gap-4">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={nombre} className="h-20 w-20 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-slate-200">
                    {nombre?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                    Subir imagen
                  </button>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG. Máximo 2MB.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">Gestionado por tu proveedor de auth.</p>
            </div>

            {user?.role && (
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Rol en el workspace</label>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 capitalize">
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timezone & Language */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Zona horaria e idioma</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Zona horaria</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors">
                <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/Santiago">Santiago (GMT-4)</option>
                <option value="America/Bogota">Bogotá (GMT-5)</option>
                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                <option value="America/New_York">Nueva York (GMT-5)</option>
                <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                <option value="Europe/Madrid">Madrid (GMT+1)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Idioma</label>
              <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors">
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Notificaciones</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Notificaciones por email</p>
                <p className="text-xs text-slate-500">Recibí actualizaciones importantes en tu correo</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifEmail}
                onClick={() => setNotifEmail(!notifEmail)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifEmail ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${notifEmail ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Notificaciones in-app</p>
                <p className="text-xs text-slate-500">Mostrá notificaciones dentro de la plataforma</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifApp}
                onClick={() => setNotifApp(!notifApp)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifApp ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${notifApp ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              Cambios guardados
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* API Keys section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <Key className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">API Keys para Cowork</h2>
              <p className="text-xs text-slate-500">Conecta herramientas externas como Cowork Desktop</p>
            </div>
          </div>
          <Link href="/settings/api-keys" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
            Gestionar API Keys
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
          <p className="text-sm text-slate-600 mb-3">
            Genera una API key para sincronizar tareas, clientes y proyectos con Cowork automaticamente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[['1', 'Genera una key'], ['2', 'Pegala en Cowork'], ['3', 'Tareas sincronizadas']].map(([n, label]) => (
              <div key={n} className="bg-white rounded-lg border border-slate-200 p-3">
                <p className="text-2xl font-bold text-slate-900">{n}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gestión de cuenta / suscripción ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Gestión de cuenta</h2>
            <p className="text-xs text-slate-500">Suscripción, cancelación y eliminación de datos</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Plan actual */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-900">Plan actual</p>
              <p className="text-xs text-slate-500 mt-0.5">Tu plan de suscripción vigente</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              accountStatus?.plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {accountStatus?.plan || 'free'}
            </span>
          </div>

          {/* Cancelar suscripción */}
          {accountStatus?.plan !== 'free' && accountStatus?.status !== 'cancelled' && (
            <div className="flex items-start justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Cancelar suscripción</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Al cancelar, tu plan actual sigue activo hasta fin del período ya pagado.
                  Luego bajás automáticamente al plan gratuito.
                </p>
              </div>
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={!!actionLoading}
                className="ml-4 flex-shrink-0 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors"
              >
                Cancelar suscripción
              </button>
            </div>
          )}

          {/* Ir a billing */}
          <div className="flex items-start justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-900">Facturación</p>
              <p className="text-xs text-slate-500 mt-0.5">Ver facturas, cambiar plan o método de pago</p>
            </div>
            <Link
              href="/settings/billing"
              className="ml-4 flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Ir a facturación
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Desactivar cuenta */}
          {!isDeactivated && (
            <div className="flex items-start justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Desactivar cuenta</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suspende tu cuenta temporalmente. Todos tus datos se conservan por 90 días.
                  Podés reactivar en cualquier momento dentro de ese período.
                </p>
              </div>
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                disabled={!!actionLoading}
                className="ml-4 flex-shrink-0 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Desactivar cuenta
              </button>
            </div>
          )}

          {/* Reactivar (si está desactivada) */}
          {isDeactivated && (
            <div className="flex items-start justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Reactivar cuenta</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reactiva tu cuenta y recupera todos tus datos.
                  {accountStatus.daysUntilDeletion !== null && (
                    <span className="text-red-500 font-medium"> Quedan {accountStatus.daysUntilDeletion} días antes del borrado definitivo.</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleReactivate}
                disabled={actionLoading === 'reactivate'}
                className="ml-4 flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'reactivate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reactivar cuenta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal confirmar cancelación ─────────────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cancelar suscripción</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              ¿Confirmás que querés cancelar tu suscripción?
            </p>
            <ul className="text-sm text-slate-600 space-y-1 mb-6 list-disc list-inside">
              <li>Tu plan actual sigue activo hasta fin del período pagado</li>
              <li>Después bajás automáticamente al plan gratuito</li>
              <li>Tus datos y clientes se conservan en el plan gratuito</li>
              <li>Podés volver a suscribirte en cualquier momento</li>
            </ul>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                No, mantener suscripción
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading === 'cancel'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar desactivación ───────────────────────────────────────── */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Desactivar cuenta</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              ¿Confirmás que querés desactivar tu cuenta?
            </p>
            <ul className="text-sm text-slate-600 space-y-1 mb-6 list-disc list-inside">
              <li>Tu cuenta quedará suspendida inmediatamente</li>
              <li>Todos tus datos se conservan por <strong>90 días</strong></li>
              <li>Podés reactivar dentro de ese período pagando de nuevo</li>
              <li>Después de 90 días, los datos se borran permanentemente</li>
            </ul>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeactivateAccount}
                disabled={actionLoading === 'deactivate'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'deactivate' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
