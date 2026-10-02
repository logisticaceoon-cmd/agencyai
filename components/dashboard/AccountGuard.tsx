'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Cache a nivel de módulo — persiste mientras el JS esté en memoria
// El check solo corre UNA vez por sesión, no en cada cambio de ruta
let accountStatusCache: 'ok' | 'deactivated' | null = null
let pendingCheck: Promise<'ok' | 'deactivated'> | null = null

async function checkAccountStatus(): Promise<'ok' | 'deactivated'> {
  if (accountStatusCache) return accountStatusCache
  if (pendingCheck) return pendingCheck

  pendingCheck = fetch('/api/account/status')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const result: 'ok' | 'deactivated' = data?.status === 'deactivated' ? 'deactivated' : 'ok'
      accountStatusCache = result
      pendingCheck = null
      return result
    })
    .catch(() => {
      pendingCheck = null
      accountStatusCache = 'ok' // En caso de error de red, dejar pasar
      return 'ok' as const
    })

  return pendingCheck
}

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(() => accountStatusCache === 'ok')
  const ranRef = useRef(false)

  useEffect(() => {
    // Si ya tenemos el resultado en caché, no hacer nada
    if (accountStatusCache === 'ok') {
      setChecked(true)
      return
    }

    // Rutas que siempre están permitidas sin verificar
    const allowed = ['/deactivated', '/login', '/register', '/invite', '/settings/billing', '/settings/account']
    if (allowed.some(p => pathname.startsWith(p))) {
      setChecked(true)
      return
    }

    // Solo llamar una vez aunque el componente re-renderice
    if (ranRef.current) return
    ranRef.current = true

    checkAccountStatus().then(status => {
      if (status === 'deactivated') {
        router.replace('/deactivated')
      } else {
        setChecked(true)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intencional: solo mount inicial

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
