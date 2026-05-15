'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast({ title: 'Error al iniciar sesion', description: error.message, variant: 'destructive' })
        return
      }
      await fetch('/api/auth/me', { method: 'PATCH' })
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast({ title: 'Error inesperado', variant: 'destructive' })
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
          <p className="text-[var(--text-muted)]">Gestion todo-en-uno para tu agencia</p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white p-8 shadow-[var(--shadow-lg)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Iniciar sesion</h2>

          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-[var(--text-secondary)]">Contrasena</label>
                <Link href="/forgot-password" className="text-[12px] text-[var(--blue)] hover:text-[#1d4ed8] transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-4 py-2.5 pr-10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:shadow-[var(--shadow-focus)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius-md)] bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2 shadow-[0_1px_2px_rgba(37,99,235,0.3)]"
            >
              {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            No tenes cuenta?{' '}
            <Link href="/register" className="text-[var(--blue)] hover:text-[#1d4ed8] font-medium transition-colors">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
