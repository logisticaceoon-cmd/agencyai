'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { Suspense } from 'react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('inviteToken')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        toast({ title: 'Error al registrarse', description: error.message, variant: 'destructive' })
        return
      }
      if (data.user) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName, supabaseId: data.user.id }),
        })
        if (!res.ok) {
          const err = await res.json()
          toast({ title: 'Error al crear perfil', description: err.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Cuenta creada exitosamente' })

        if (inviteToken) {
          router.push(`/invite/${inviteToken}`)
        } else {
          router.push('/onboarding')
        }
        router.refresh()
      }
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
          <p className="text-[var(--text-muted)]">
            {inviteToken ? 'Crea tu cuenta para aceptar la invitacion' : 'Empeza gratis hoy'}
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white p-8 shadow-[var(--shadow-lg)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Crear cuenta</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Maria Garcia"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:shadow-[var(--shadow-focus)] transition-all"
              />
            </div>

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
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Contrasena</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimo 8 caracteres"
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            Ya tenes cuenta?{' '}
            <Link href="/login" className="text-[var(--blue)] hover:text-[#1d4ed8] font-medium transition-colors">
              Iniciar sesion
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          Sin tarjeta de credito · Plan Free para siempre
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
