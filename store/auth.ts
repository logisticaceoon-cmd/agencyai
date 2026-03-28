import { create } from 'zustand'

export interface UserInfo {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  role: string
}

export interface OrgInfo {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  maxClients: number
}

interface AuthState {
  user: UserInfo | null
  org: OrgInfo | null
  isLoading: boolean
  setUser: (user: UserInfo | null) => void
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
