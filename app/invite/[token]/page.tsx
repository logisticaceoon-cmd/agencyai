'use client'

import { useState } from 'react'
import { use } from 'react'
import { Zap, Loader2, Check } from 'lucide-react'
import Link from 'next/link'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invitations/${token}`, { method: 'POST' })
      if (res.ok) {
        setAccepted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al aceptar la invitacion')
      }
    } catch {
      setError('Error de conexion')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Zap className="h-8 w-8 text-white" />
          </div>

          {accepted ? (
            <>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Invitacion aceptada</h1>
              <p className="text-sm text-slate-500 mb-6">Ya sos parte del workspace. Inicia sesion para empezar.</p>
              <Link href="/sign-in" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                Iniciar sesion
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Te invitaron a un workspace</h1>
              <p className="text-sm text-slate-500 mb-6">Acepta la invitacion para unirte al equipo en AgencyAI.</p>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button onClick={handleAccept} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? 'Aceptando...' : 'Aceptar invitacion'}
              </button>

              <p className="text-xs text-slate-400 mt-4">
                No tenes cuenta? <Link href={`/sign-up?invite=${token}`} className="text-blue-600 hover:text-blue-700">Registrate primero</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
