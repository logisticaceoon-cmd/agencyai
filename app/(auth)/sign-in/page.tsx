'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { Eye, EyeOff, Zap, Mail, ArrowLeft, RefreshCw } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>
type View = 'login' | 'forgot' | 'forgot-sent'

export default function SignInPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Forgot password state
  const [view, setView] = useState<View>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        toast({ title: 'Error al iniciar sesión', description: error.message, variant: 'destructive' })
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast({ title: 'Error inesperado', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })
      if (error) {
        toast({ title: 'Error con Google', description: error.message, variant: 'destructive' })
        setGoogleLoading(false)
      }
    } catch {
      toast({ title: 'Error inesperado', variant: 'destructive' })
      setGoogleLoading(false)
    }
  }

  async function handleForgotPassword(email?: string) {
    const targetEmail = email ?? forgotEmail
    if (!targetEmail) {
      setForgotError('Ingresá tu email')
      return
    }
    setForgotLoading(true)
    setForgotError('')
    try {
      // Verificar si el email está registrado antes de enviar
      const checkRes = await fetch(`/api/auth/check-email?email=${encodeURIComponent(targetEmail)}`)
      const checkData = await checkRes.json()
      if (!checkData.exists) {
        setForgotError('Este email no está registrado. Verificá que sea el correcto.')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setForgotError(error.message)
        return
      }
      setView('forgot-sent')
    } catch {
      setForgotError('Error inesperado. Intentá de nuevo.')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleResendEmail() {
    if (resendCooldown) return
    setResendCooldown(true)
    await handleForgotPassword(forgotEmail)
    // Reset cooldown after 30 seconds
    setTimeout(() => setResendCooldown(false), 30000)
  }

  // ── FORGOT-SENT VIEW ─────────────────────────────────────────────
  if (view === 'forgot-sent') {
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

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-2">¡Email enviado!</h2>
            <p className="text-sm text-slate-500 mb-1">
              Revisá tu bandeja de entrada en
            </p>
            <p className="text-sm font-semibold text-slate-800 mb-2">{forgotEmail}</p>
            <p className="text-sm text-slate-500 mb-6">
              y hacé click en el link para restablecer tu contraseña.
            </p>
            <p className="text-xs text-slate-400 mb-8">¿No lo ves? Revisá la carpeta de spam.</p>

            {/* Reenviar email */}
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resendCooldown || forgotLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
            >
              <RefreshCw className={`h-4 w-4 ${forgotLoading ? 'animate-spin' : ''}`} />
              {resendCooldown && !forgotLoading ? 'Reenviado ✓' : forgotLoading ? 'Reenviando...' : 'Reenviar email'}
            </button>

            {/* Iniciar sesión */}
            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── FORGOT VIEW ──────────────────────────────────────────────────
  if (view === 'forgot') {
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
            <button
              type="button"
              onClick={() => { setView('login'); setForgotError('') }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al login
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-1">Recuperar contraseña</h2>
            <p className="text-sm text-slate-500 mb-6">
              Ingresá tu email y te enviamos un link para crear una nueva contraseña.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                    placeholder="tu@agencia.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>
                {forgotError && <p className="mt-1 text-xs text-red-500">{forgotError}</p>}
              </div>

              <button
                type="button"
                onClick={() => handleForgotPassword()}
                disabled={forgotLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {forgotLoading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LOGIN VIEW (default) ─────────────────────────────────────────
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

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresá a tu cuenta para continuar</p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors mb-6"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">o con email</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="tu@agencia.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setForgotError('') }}
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link href="/sign-up" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
