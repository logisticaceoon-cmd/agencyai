'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { Zap, Building2, Check, AlertTriangle } from 'lucide-react'

interface InvitationData {
  id: string
  email: string
  role: string
  organization: {
    name: string
    logoUrl: string | null
    plan: string
  }
}

export default function InvitePage() {
  const { token } = useParams()
  const router = useRouter()
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setInvitation(res.data)
      })
      .catch(() => setError('Error al cargar la invitación'))
      .finally(() => setLoading(false))
  }, [token])

  async function acceptInvitation() {
    setAccepting(true)
    try {
      const res = await fetch(`/api/invitations/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        // User might not be logged in
        if (res.status === 401) {
          router.push(`/register?inviteToken=${token}`)
          return
        }
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: '¡Invitación aceptada!', description: `Bienvenido a ${invitation?.organization.name}` })
      router.push('/dashboard')
    } catch {
      toast({ title: 'Error inesperado', variant: 'destructive' })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-zinc-500">Cargando invitación...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">AgencyAI</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
          {error ? (
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                <AlertTriangle className="h-7 w-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Invitación no válida</h2>
              <p className="text-sm text-zinc-400 mb-6">{error}</p>
              <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300">
                Ir al inicio de sesión
              </Link>
            </div>
          ) : invitation ? (
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                <Building2 className="h-7 w-7 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Te invitaron a unirte</h2>
              <p className="text-zinc-400 mb-1">
                Fuiste invitado a{' '}
                <span className="text-white font-medium">{invitation.organization.name}</span>
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                Rol: <span className="text-zinc-300 capitalize">{invitation.role}</span> ·
                Para: <span className="text-zinc-300">{invitation.email}</span>
              </p>

              <div className="space-y-3">
                <button
                  onClick={acceptInvitation}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {accepting ? 'Aceptando...' : (
                    <><Check className="h-4 w-4" /> Aceptar invitación</>
                  )}
                </button>
                <p className="text-xs text-zinc-600">
                  ¿No tenés cuenta?{' '}
                  <Link href={`/register?inviteToken=${token}`} className="text-indigo-400 hover:text-indigo-300">
                    Registrarte primero
                  </Link>
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
