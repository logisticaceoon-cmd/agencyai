'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap, Eye, EyeOff } from 'lucide-react'

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

  useEffect(() => {
    // Supabase maneja el token de recovery en el hash de la URL automáticamente
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    // También verificar si hay token_hash en los params (flujo desde el hook)
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then((result: { error: { message: string } | null }) => {
        if (!result.error) setSessionReady(true)
        else setError('El link expiró. Solicitá uno nuevo.')
      })
    }
  }, [searchParams])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('No se pudo actualizar la contraseña. Intentá de nuevo.')
      } else {
        setDone(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch {
      setError('Error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--blue)] flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-bold text-[var(--text-primary)]">AgencyAI</span>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white p-8 shadow-[var(--shadow-lg)]">
          {done ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">¡Contraseña actualizada!</h2>
              <p className="text-[13px] text-[var(--text-muted)]">Redirigiendo al dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Nueva contraseña</h2>
              <p className="text-[13px] text-[var(--text-muted)] mb-6">Elegí una contraseña segura de al menos 8 caracteres.</p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-4 py-2.5 pr-10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:shadow-[var(--shadow-focus)] transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repetí la contraseña"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:shadow-[var(--shadow-focus)] transition-all"
                  />
                </div>

                {error && (
                  <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-[var(--radius-md)]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[var(--radius-md)] bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_1px_2px_rgba(37,99,235,0.3)]"
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
