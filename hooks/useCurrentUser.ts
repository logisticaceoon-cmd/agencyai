'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function useCurrentUser() {
  const { user, org, isLoading, setUser, setOrg, setLoading } = useAuthStore()
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        // First get the Supabase auth user
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setSupabaseUser(authUser)

        // Then fetch the app user data from our API
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setOrg(data.org ?? null)
        } else if (authUser) {
          // Auth user exists but no app user yet
          setUser({
            id: authUser.id,
            fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            email: authUser.email || '',
            role: 'owner',
            avatarUrl: authUser.user_metadata?.avatar_url || null,
          } as never)
          setOrg(null)
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

  return { user, org, isLoading, supabaseUser }
}
