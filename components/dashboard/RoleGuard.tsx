'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { canAccessSection, normalizeRole } from '@/lib/roles'

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }

    const role = normalizeRole(user.role)

    // Check exact path first (most specific), then fall back to first-level segment.
    // This allows sub-routes like /settings/account to have independent permissions
    // separate from the parent /settings route.
    let allowed = canAccessSection(role, pathname)
    if (!allowed) {
      const segment = '/' + pathname.split('/')[1]
      if (segment !== pathname) {
        allowed = canAccessSection(role, segment)
      }
    }

    if (!allowed) {
      router.replace('/dashboard')
    }
  }, [user, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
