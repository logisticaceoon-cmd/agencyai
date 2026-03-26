'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

export function useCurrentUser() {
  const { user, org, isLoading, setUser, setOrg, setLoading } = useAuthStore()

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setOrg(data.org ?? null)
        } else {
          setUser(null)
          setOrg(null)
        }
      } catch {
        setUser(null)
        setOrg(null)
      } finally {
        setLoading(false)
      }
    }

    if (isLoading) {
      fetchUser()
    }
  }, [isLoading, setUser, setOrg, setLoading])

  return { user, org, isLoading }
}
