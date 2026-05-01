'use client'

import { useWorkspace } from './useWorkspace'

export interface PlanLimits {
  plan: string
  isPro: boolean          // true si plan >= pro
  maxClients: number
  maxProjects: number
  maxUsers: number
  // Features granulares
  hasAI: boolean
  hasPortal: boolean
  hasReportsPDF: boolean
  hasFinances: boolean          // finanzas > clientes (disponible en free)
  hasFinanceNominas: boolean    // finanzas > nóminas (solo pro)
  hasFinanceGastos: boolean     // finanzas > gastos (solo pro)
  hasFinanceResumen: boolean    // finanzas > resumen (solo pro)
  hasKPIs: boolean
  hasObjectives: boolean
  hasAudits: boolean
  hasRecordings: boolean
  hasAlerts: boolean
  hasPerformance: boolean
  hasDocs: boolean
  hasApiKeys: boolean
}

const PRO_PLANS = new Set(['pro', 'agency', 'scale'])

function buildLimits(plan: string): PlanLimits {
  const pro = PRO_PLANS.has(plan)
  return {
    plan,
    isPro: pro,
    maxClients: pro ? Infinity : 3,
    maxProjects: pro ? Infinity : 10,
    maxUsers: pro ? Infinity : 1,
    // Finanzas
    hasFinances: true,              // Tab "Clientes" siempre disponible
    hasFinanceNominas: pro,         // Tab "Nóminas" solo pro
    hasFinanceGastos: pro,          // Tab "Gastos" solo pro
    hasFinanceResumen: pro,         // Tab "Resumen" solo pro
    // Todo lo demás
    hasAI: pro,
    hasPortal: pro,
    hasReportsPDF: pro,
    hasKPIs: pro,
    hasObjectives: pro,
    hasAudits: pro,
    hasRecordings: pro,
    hasAlerts: pro,
    hasPerformance: pro,
    hasDocs: pro,
    hasApiKeys: pro,
  }
}

export function usePlanLimits(): PlanLimits & { loading: boolean } {
  const { workspace, loading } = useWorkspace()
  const plan = workspace?.plan || 'free'
  return { ...buildLimits(plan), loading }
}
