'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap, Loader2 } from 'lucide-react'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function confirm() {
      const token_hash = searchParams.get('token_hash')
      const type       = searchParams.get('type') as 'recovery' | 'signup' | 'invite' | 'magiclink' | null
      const next       = searchParams.get('next') || '/dashboard'

      if (!token_hash || !type) {
        router.replace('/sign-in?error=link_invalido')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })

      if (error) {
        console.error('[auth/confirm] verifyOtp error:', error.message)
        if (error.message?.toLowerCase().includes('expired') || error.message?.toLowerCase().includes('invalid')) {
          router.replace('/sign-in?error=link_expirado')
        } else {
          router.replace('/sign-in?error=link_invalido')
        }
        return
      }

      // OTP verificado — redirigir al destino
      router.replace(next)
    }

    confirm()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">AgencyAI</span>
        </div>
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Verificando tu identidad...</p>
      </div>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
