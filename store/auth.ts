import { create } from 'zustand'
import { User } from '@/types'
import { OrgPlan } from '@prisma/client'

export interface OrgInfo {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  maxUsers: number
  maxClients: number
}

interface AuthState {
  user: User | null
  org: OrgInfo | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setOrg: (org: OrgInfo | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setOrg: (org) => set({ org }),
  setLoading: (isLoading) => set({ isLoading }),
}))
