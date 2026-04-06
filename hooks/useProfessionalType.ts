'use client'

import { useContext } from 'react'
import { ProfessionalTypeContext, DEFAULT_CONFIG } from '@/components/providers/ProfessionalTypeProvider'

export interface ProfessionalTerminology {
  clients: string
  projects: string
  tasks: string
  reports: string
  income: string
  team: string
}

export interface ProfessionalConfig {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  terminology: ProfessionalTerminology
  defaultClientCategories: Array<{ name: string; icon: string; color: string }>
  suggestedKpis: string[]
  aiAgentContext: string
}

export function useProfessionalType() {
  const ctx = useContext(ProfessionalTypeContext)
  if (!ctx) return { config: DEFAULT_CONFIG, loading: false, refresh: async () => {} }
  return ctx
}
