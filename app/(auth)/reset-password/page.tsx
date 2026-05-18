'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap, Eye, EyeOff } from 'lucide-react'
import type { AuthChangeEvent } from '@supabase/supabase-js'

function ResetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      // Case 1: arriving with token_hash in URL (direct link from email)
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (error) {
          setError('El link expiró. Solicitá uno nuevo desde el login.')
        } else {
          setSessionReady(true)
        }
        setCheckingSession(false)
        return
      }

      // Case 2: arriving from /auth/confirm which already verified the token
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
        setCheckingSession(false)
        return
      }

      // Case 3: listen for PASSWORD_RECOVERY event (Supabase hash-based flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true)
          setCheckingSession(false)
        }
      })

      // Timeout fallback — if no session after 3s, show error
      setTimeout(() => {
        setCheckingSession(false)
        setError('Link inválido o sesión expirada. Solicitá uno nuevo.')
        subscription.unsubscribe()
      }, 3000)
    }

    init()
  }, [searchParams])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('No se pudo actualizar. Intentá solicitar un nuevo link de recuperación.')
        console.error('updateUser error:', error)
      } else {
        setDone(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch (err) {
      console.error('Unexpected:', err)
      setError('Error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center">
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">AgencyAI</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {done ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-sm text-slate-500">Redirigiendo al dashboard...</p>
            </div>
          ) : !sessionReady && error ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Link inválido</h2>
              <p className="text-sm text-slate-500 mb-6">{error}</p>
              <a href="/forgot-password" className="inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                Solicitar nuevo link
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Nueva contraseña</h2>
              <p className="text-sm text-slate-500 mb-6">Elegí una contraseña segura de al menos 8 caracteres.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required placeholder="Repetí la contraseña"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center">
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
      </div>
    }>
      <ResetContent />
    </Suspense>
  )
}
