'use client'

import { useState, useEffect } from 'react'
import { User, Camera, Globe, Bell, Save, Key, ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthStore } from '@/store/auth'

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

  // Load real user data
  useEffect(() => {
    if (user) {
      setNombre(user.fullName || '')
      setEmail(user.email || '')
    }
  }, [user])

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
        // Update local store so Header and other components reflect the change
        if (user) {
          setUser({ ...user, fullName: nombre })
        }
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // silently fail — toast would be better but keeping it simple
    } finally {
      setSaving(false)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>
        <p className="text-sm text-slate-500 mt-1">Gestioná tu perfil y preferencias personales</p>
      </div>

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
            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Foto de perfil</label>
              <div className="flex items-center gap-4">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={nombre}
                    className="h-20 w-20 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-slate-200">
                    {nombre?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Subir imagen
                  </button>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG. Máximo 2MB.</p>
                </div>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Email — read only */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">
                Gestionado por tu proveedor de auth. No se puede modificar desde aquí.
              </p>
            </div>

            {/* Role badge */}
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
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
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
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifEmail ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    notifEmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifApp ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    notifApp ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
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
          <Link
            href="/settings/api-keys"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Gestionar API Keys
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
          <p className="text-sm text-slate-600 mb-3">
            Genera una API key para sincronizar tareas, clientes y proyectos con Cowork automaticamente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-2xl font-bold text-slate-900">1</p>
              <p className="text-xs text-slate-500 mt-0.5">Genera una key</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-2xl font-bold text-slate-900">2</p>
              <p className="text-xs text-slate-500 mt-0.5">Pegala en Cowork</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-2xl font-bold text-slate-900">3</p>
              <p className="text-xs text-slate-500 mt-0.5">Tareas sincronizadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
