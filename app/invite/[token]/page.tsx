'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, Check, Users, Shield, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole } from '@/lib/roles'

interface InviteData {
  token: string
  email: string
  role: string
  workspace_id: string
  accepted_at: string | null
  expires_at: string
  workspaces: { name: string; plan: string }
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null)
  const [acceptError, setAcceptError] = useState('')

  // Cargar datos de la invitación y usuario actual
  useEffect(() => {
    async function load() {
      // Chequear si hay sesión activa
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) setCurrentUser({ email: user.email })
      } catch { /* no session */ }

      // Cargar datos de la invitación
      try {
        const res = await fetch(`/api/invitations/${token}`)
        const data = await res.json()
        if (!res.ok) {
          setInviteError(data.error || 'Invitación no válida')
        } else {
          setInvite(data.data)
          // Si ya estaba aceptada
          if (data.data?.accepted_at) {
            setInviteError('Esta invitación ya fue aceptada.')
          }
          // Si expiró
          if (data.data?.expires_at && new Date(data.data.expires_at) < new Date()) {
            setInviteError('Esta invitación expiró.')
          }
        }
      } catch {
        setInviteError('Error al cargar la invitación.')
      } finally {
        setLoadingInvite(false)
      }
    }
    load()
  }, [token])

  async function handleAccept() {
    if (!currentUser) return
    setAccepting(true)
    setAcceptError('')
    try {
      const res = await fetch(`/api/invitations/${token}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setAccepted(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setAcceptError(data.error || 'Error al aceptar la invitación')
      }
    } catch {
      setAcceptError('Error de conexión')
    }
    setAccepting(false)
  }

  const role = normalizeRole(invite?.role)
  const roleLabel = ROLE_LABELS[role]
  const roleDescription = ROLE_DESCRIPTIONS[role]

  const ROLE_ICONS = {
    owner: '👑',
    admin: '⚡',
    trafficker: '🎯',
    viewer: '👁️',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">AgencyAI</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Loading */}
          {loadingInvite && (
            <div className="p-10 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Cargando invitación...</p>
            </div>
          )}

          {/* Error */}
          {!loadingInvite && inviteError && (
            <div className="p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Invitación no válida</h2>
              <p className="text-sm text-slate-500 mb-6">{inviteError}</p>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          )}

          {/* Accepted success */}
          {!loadingInvite && !inviteError && accepted && (
            <div className="p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">¡Bienvenido al equipo!</h2>
              <p className="text-sm text-slate-500 mb-1">
                Ya eres parte de <strong>{invite?.workspaces?.name}</strong>.
              </p>
              <p className="text-xs text-slate-400">Redirigiendo al dashboard...</p>
              <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-[progress_2s_ease-in-out]" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {/* Invite details */}
          {!loadingInvite && !inviteError && !accepted && invite && (
            <div>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                    {ROLE_ICONS[role]}
                  </div>
                  <div>
                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Invitación para</p>
                    <h1 className="text-xl font-bold">{invite.workspaces?.name}</h1>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Role info */}
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-900">Tu rol: {roleLabel}</span>
                  </div>
                  <p className="text-xs text-slate-500">{roleDescription}</p>
                </div>

                {/* Email info */}
                <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <Users className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    Esta invitación es para <strong>{invite.email}</strong>
                  </p>
                </div>

                {/* Error */}
                {acceptError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                    <p className="text-sm text-red-700">{acceptError}</p>
                  </div>
                )}

                {/* User is logged in with matching email */}
                {currentUser?.email === invite.email && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <Check className="h-3.5 w-3.5" />
                      Sesión activa como {currentUser.email}
                    </div>
                    <button
                      onClick={handleAccept}
                      disabled={accepting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-600/20"
                    >
                      {accepting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Aceptando...</>
                      ) : (
                        <>Unirme a {invite.workspaces?.name} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                )}

                {/* User logged in with different email */}
                {currentUser && currentUser.email !== invite.email && (
                  <div>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        Sesión activa con <strong>{currentUser.email}</strong>, pero la invitación es para <strong>{invite.email}</strong>.
                        Cerrá sesión y accedé con la cuenta correcta.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="/sign-in"
                        className="flex-1 text-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Cambiar cuenta
                      </Link>
                    </div>
                  </div>
                )}

                {/* Not logged in */}
                {!currentUser && (
                  <div className="space-y-3">
                    <Link
                      href={`/sign-up?invite=${token}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Crear cuenta y unirme <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/sign-in?invite=${token}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Ya tengo cuenta — Iniciar sesión
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          AgencyAI · Gestión de agencias digitales
        </p>
      </div>
    </div>
  )
}
