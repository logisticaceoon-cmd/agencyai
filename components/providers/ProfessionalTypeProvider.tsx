'use client'

import { createContext, useCallback, useEffect, useState, ReactNode } from 'react'
import type { ProfessionalConfig } from '@/hooks/useProfessionalType'

export const DEFAULT_CONFIG: ProfessionalConfig = {
  id: 'marketing_agency',
  name: 'Agencia de Marketing Digital',
  icon: '📊',
  color: '#2563eb',
  terminology: {
    clients: 'Clientes',
    projects: 'Proyectos',
    tasks: 'Tareas',
    reports: 'Reportes',
    income: 'Ingresos',
    team: 'Equipo',
  },
  defaultClientCategories: [],
  suggestedKpis: [],
  aiAgentContext: '',
}

interface ContextValue {
  config: ProfessionalConfig
  loading: boolean
  refresh: () => Promise<void>
}

export const ProfessionalTypeContext = createContext<ContextValue | null>(null)

export function ProfessionalTypeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ProfessionalConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/professional-type')
      if (res.ok) {
        const data = await res.json()
        if (data?.config) setConfig(data.config)
      }
    } catch {
      // Keep default config on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <ProfessionalTypeContext.Provider value={{ config, loading, refresh }}>
      {children}
    </ProfessionalTypeContext.Provider>
  )
}
