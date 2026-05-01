export type PlanId = 'free' | 'starter' | 'pro' | 'agency' | 'scale'

export interface Plan {
  id: PlanId
  name: string
  price: number
  maxUsers: number
  maxClients: number
  description: string
  features: string[]
  highlighted?: boolean
}

// ─── SIMPLIFICADO: Free + Pro ──────────────────────────────────────────────────
// Los planes legacy (starter, agency, scale) se mantienen para compatibilidad
// pero el producto solo ofrece Free y Pro activamente.

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    maxUsers: 1,
    maxClients: 3,
    description: 'Para empezar a organizarte',
    features: [
      '1 usuario',
      'Hasta 3 clientes',
      'Proyectos y tareas',
      'Gestión de clientes (fees + comisiones)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 30,
    maxUsers: 999,
    maxClients: 999,
    description: 'Todo lo que necesitás para crecer',
    features: [
      'Clientes ilimitados',
      'Usuarios ilimitados',
      'Finanzas completas (nóminas, gastos, resumen)',
      'KPIs y métricas',
      'Objetivos y OKRs',
      'Portal del cliente',
      'Auditorías',
      'IA integrada',
      'API Keys (Cowork)',
      'Grabaciones',
      'Sin branding',
    ],
    highlighted: true,
  },
  // Legacy — compatibilidad con cuentas antiguas
  {
    id: 'starter',
    name: 'Starter',
    price: 12,
    maxUsers: 4,
    maxClients: 10,
    description: 'Para freelancers',
    features: ['4 usuarios', '10 clientes', 'Finanzas básicas'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 99,
    maxUsers: 10,
    maxClients: 20,
    description: 'Para agencias establecidas',
    features: ['10 usuarios', '20 clientes', 'Todo Pro', 'Portal cliente'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 149,
    maxUsers: 20,
    maxClients: 40,
    description: 'Para agencias grandes',
    features: ['20 usuarios', '40 clientes', 'Todo Agency'],
  },
]

export const PLAN_MAP: Record<PlanId, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.id, p])
) as Record<PlanId, Plan>

export function getPlanLimits(planId: PlanId) {
  return PLAN_MAP[planId] ?? PLAN_MAP.free
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}
