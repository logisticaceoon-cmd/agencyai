'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // No bloquear estas rutas (necesitan acceso sin importar estado)
    const allowed = ['/deactivated', '/login', '/register', '/invite', '/settings/billing', '/settings/account']
    if (allowed.some(p => pathname.startsWith(p))) {
      setChecked(true)
      return
    }

    fetch('/api/account/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.status === 'deactivated') {
          router.replace('/deactivated')
        } else {
          setChecked(true)
        }
      })
      .catch(() => setChecked(true)) // En caso de error, dejar pasar
  }, [pathname, router])

  if (!checked) {
    // Pantalla de carga mínima mientras verifica
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
