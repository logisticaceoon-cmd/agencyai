'use client'

import { useWorkspace } from './useWorkspace'

export interface PlanLimits {
  plan: string
  maxClients: number
  maxProjects: number
  maxUsers: number
  hasAI: boolean
  hasPortal: boolean
  hasReportsPDF: boolean
  hasFinances: boolean
  hasKPIs: boolean
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    plan: 'free',
    maxClients: 3,
    maxProjects: 5,
    maxUsers: 1,
    hasAI: false,
    hasPortal: false,
    hasReportsPDF: false,
    hasFinances: false,
    hasKPIs: false,
  },
  starter: {
    plan: 'starter',
    maxClients: 10,
    maxProjects: 15,
    maxUsers: 3,
    hasAI: false,
    hasPortal: false,
    hasReportsPDF: false,
    hasFinances: false,
    hasKPIs: false,
  },
  pro: {
    plan: 'pro',
    maxClients: Infinity,
    maxProjects: Infinity,
    maxUsers: 5,
    hasAI: true,
    hasPortal: false,
    hasReportsPDF: true,
    hasFinances: true,
    hasKPIs: true,
  },
  agency: {
    plan: 'agency',
    maxClients: Infinity,
    maxProjects: Infinity,
    maxUsers: Infinity,
    hasAI: true,
    hasPortal: true,
    hasReportsPDF: true,
    hasFinances: true,
    hasKPIs: true,
  },
  scale: {
    plan: 'scale',
    maxClients: Infinity,
    maxProjects: Infinity,
    maxUsers: Infinity,
    hasAI: true,
    hasPortal: true,
    hasReportsPDF: true,
    hasFinances: true,
    hasKPIs: true,
  },
}

export function usePlanLimits(): PlanLimits & { loading: boolean } {
  const { workspace, loading } = useWorkspace()
  const plan = workspace?.plan || 'free'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  return { ...limits, loading }
}
