'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'

// ─── Inner component (needs useSearchParams) ─────────────────────
function ResetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  type Phase = 'verifying' | 'form' | 'done' | 'error'
  const [phase, setPhase] = useState<Phase>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Check for error param (from verify-recovery route when token is invalid)
    const errorParam = searchParams.get('error')
    if (errorParam === 'link_expired') {
      setErrorMsg('Este link expiró o ya fue utilizado. Solicitá uno nuevo.')
      setPhase('error')
      return
    }
    if (errorParam === 'invalid_link') {
      setErrorMsg('Link inválido. Usá el botón del email de recuperación.')
      setPhase('error')
      return
    }

    // Session should already be established by /api/auth/verify-recovery (server route)
    // Just confirm the session exists
    const supabase = createClient()
    supabase.auth.getSession().then((result: { data: { session: { user: unknown } | null } }) => {
      const session = result.data.session
      if (session) {
        setPhase('form')
      } else {
        // Listen for PASSWORD_RECOVERY event (fallback for direct Supabase hash-based flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            setPhase('form')
            subscription.unsubscribe()
          }
        })

        // Timeout fallback
        const timeout = setTimeout(() => {
          subscription.unsubscribe()
          setErrorMsg('Sesión no encontrada. Usá el link del email o solicitá uno nuevo.')
          setPhase('error')
        }, 5000)

        return () => {
          clearTimeout(timeout)
          subscription.unsubscribe()
        }
      }
    })
  }, [searchParams])

  // ── Update password ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setFormError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setFormError('No se pudo actualizar la contraseña. Intentá solicitar un nuevo link.')
        console.error('updateUser error:', error)
      } else {
        setPhase('done')
        setTimeout(() => router.push('/dashboard'), 2500)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setFormError('Error inesperado. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">AgencyAI</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {/* ── Verifying ── */}
          {phase === 'verifying' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-slate-500 text-sm">Verificando tu identidad...</p>
            </div>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Link inválido</h2>
              <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
              <a
                href="/sign-in"
                className="inline-block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-center mb-3"
              >
                Volver al login
              </a>
              <a
                href="/sign-in"
                className="inline-block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors text-center"
              >
                Solicitar nuevo link
              </a>
            </div>
          )}

          {/* ── Password Form ── */}
          {phase === 'form' && (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Crear nueva contraseña</h2>
              <p className="text-sm text-slate-500 mb-6">Elegí una contraseña segura de al menos 8 caracteres.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <p className={`mt-1 text-xs ${password.length >= 8 ? 'text-green-600' : 'text-amber-600'}`}>
                      {password.length >= 8 ? '✓ Contraseña válida' : `${8 - password.length} caracteres más`}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="Repetí la contraseña"
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && password.length >= 8 && (
                    <p className={`mt-1 text-xs ${confirm === password ? 'text-green-600' : 'text-red-500'}`}>
                      {confirm === password ? '✓ Las contraseñas coinciden' : 'No coinciden'}
                    </p>
                  )}
                </div>

                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                    <p className="text-sm text-red-600">{formError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Actualizar contraseña'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Done ── */}
          {phase === 'done' && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-sm text-slate-500">Ingresando al dashboard...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Page wrapper (Suspense required for useSearchParams) ─────────
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ResetContent />
    </Suspense>
  )
}
