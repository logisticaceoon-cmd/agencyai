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
    const segment = '/' + pathname.split('/')[1]
    const role = normalizeRole(user.role)
    if (!canAccessSection(role, segment)) {
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
