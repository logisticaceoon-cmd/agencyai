'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Zap } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setError('No pudimos enviar el email. Verificá la dirección ingresada.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Error inesperado. Intentá de nuevo.')
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
          {!sent ? (
            <>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Recuperar contraseña</h2>
              <p className="text-[13px] text-[var(--text-muted)] mb-6">
                Ingresá tu email y te enviamos un link para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@agencia.com"
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
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">¡Email enviado!</h2>
              <p className="text-[13px] text-[var(--text-muted)] mb-6">
                Revisá tu bandeja de entrada en <strong>{email}</strong> y hacé click en el link para restablecer tu contraseña.
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">¿No lo ves? Revisá la carpeta de spam.</p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            <Link href="/login" className="text-[var(--blue)] hover:text-[#1d4ed8] font-medium transition-colors">
              ← Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
