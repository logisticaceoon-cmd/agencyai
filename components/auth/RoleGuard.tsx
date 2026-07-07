'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { normalizeRole, canAccessSection } from '@/lib/roles'

interface RoleGuardProps {
  children: React.ReactNode
}

/**
 * RoleGuard — protección de rutas por rol.
 * Envuelve cualquier página del dashboard y redirige si el rol no tiene acceso.
 * Uso: <RoleGuard>{children}</RoleGuard> en el layout o en cada página.
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }

    const role = normalizeRole(user.role)

    // Encontrar la sección base del pathname (ej: /finances/... → /finances)
    const section = '/' + pathname.split('/')[1]
    const hasAccess = canAccessSection(role, section)

    if (!hasAccess) {
      router.replace('/dashboard')
    }
  }, [user, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const role = normalizeRole(user.role)
  const section = '/' + pathname.split('/')[1]

  if (!canAccessSection(role, section)) return null

  return <>{children}</>
}
