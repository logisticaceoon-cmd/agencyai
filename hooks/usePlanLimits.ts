'use client'

import { useWorkspace } from './useWorkspace'
import { FOUNDER_WORKSPACE_IDS } from '@/lib/plans'

export interface PlanLimits {
  plan: string
  isPro: boolean
  isFounder: boolean
  maxClients: number
  maxProjects: number
  maxUsers: number        // total incluyendo owner
  // Features granulares
  hasAI: boolean
  hasPortal: boolean
  hasReportsPDF: boolean
  hasFinances: boolean          // Tab Clientes — siempre disponible
  hasFinanceNominas: boolean    // Tab Nóminas — pro+
  hasFinanceGastos: boolean     // Tab Gastos — pro+
  hasFinanceResumen: boolean    // Tab Resumen — pro+
  hasKPIs: boolean
  hasObjectives: boolean
  hasAudits: boolean
  hasRecordings: boolean
  hasAlerts: boolean
  hasPerformance: boolean
  hasDocs: boolean
  hasApiKeys: boolean
}

// Planes que desbloquean features pro
const PRO_PLANS = new Set(['pro', 'agency', 'scale'])
// Planes que desbloquean features de agency+
const AGENCY_PLANS = new Set(['agency', 'scale'])

// Límites por plan
const PLAN_LIMITS: Record<string, { maxClients: number; maxUsers: number }> = {
  free:    { maxClients: 3,        maxUsers: 2   },  // owner + 1
  pro:     { maxClients: 8,        maxUsers: 4   },  // owner + 3
  agency:  { maxClients: 20,       maxUsers: 11  },  // owner + 10
  scale:   { maxClients: Infinity, maxUsers: Infinity },
  // Legacy
  starter: { maxClients: 10,       maxUsers: 4   },
}

// Límites founder — todo ilimitado
const FOUNDER_LIMITS = { maxClients: Infinity, maxUsers: Infinity }

function buildLimits(plan: string, workspaceId: string): PlanLimits {
  const founder = FOUNDER_WORKSPACE_IDS.has(workspaceId)
  const pro = founder || PRO_PLANS.has(plan)
  const agency = founder || AGENCY_PLANS.has(plan)

  const limits = founder
    ? FOUNDER_LIMITS
    : (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free)

  return {
    plan,
    isPro: pro,
    isFounder: founder,
    maxClients: limits.maxClients,
    maxProjects: pro ? Infinity : 10,
    maxUsers: limits.maxUsers,
    // Finanzas
    hasFinances: true,              // Tab "Clientes" siempre disponible
    hasFinanceNominas: pro,
    hasFinanceGastos: pro,
    hasFinanceResumen: pro,
    // Features pro
    hasAI: pro,
    hasReportsPDF: pro,
    hasKPIs: pro,
    hasObjectives: pro,
    hasPerformance: pro,
    hasDocs: pro,
    hasAlerts: pro,
    // Features agency+
    hasPortal: agency,
    hasAudits: agency,
    hasRecordings: agency,
    hasApiKeys: agency,
  }
}

export function usePlanLimits(): PlanLimits & { loading: boolean } {
  const { workspace, loading } = useWorkspace()
  const plan = workspace?.plan || 'free'
  const workspaceId = workspace?.id || ''
  return { ...buildLimits(plan, workspaceId), loading }
}
