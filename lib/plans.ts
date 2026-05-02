export type PlanId = 'free' | 'starter' | 'pro' | 'agency' | 'scale'

export interface Plan {
  id: PlanId
  name: string
  price: number
  maxUsers: number       // incluye al owner (ej: 2 = owner + 1)
  maxClients: number
  description: string
  features: string[]
  highlighted?: boolean
}

// ─── Founder accounts — acceso ilimitado sin importar el plan ─────────────────
// Agregar workspace IDs de cuentas founder acá
export const FOUNDER_WORKSPACE_IDS = new Set([
  '41b4b8ab-2483-418d-bb29-d39084ca36f0', // Rafael — Logística CEOON
])

// ─── Planes activos ───────────────────────────────────────────────────────────
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    maxUsers: 2,          // owner + 1
    maxClients: 3,
    description: 'Para empezar a organizarte',
    features: [
      'Owner + 1 usuario',
      'Hasta 3 clientes',
      'Proyectos y tareas',
      'Gestión de clientes (fees + comisiones)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    maxUsers: 4,          // owner + 3
    maxClients: 8,
    description: 'Para agencias pequeñas establecidas',
    highlighted: true,
    features: [
      'Owner + 3 usuarios',
      'Hasta 8 clientes',
      'Proyectos ilimitados',
      'Finanzas completas (nóminas, gastos, resumen)',
      'KPIs y métricas',
      'Objetivos y OKRs',
      'IA integrada',
      'Soporte por email',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 59,
    maxUsers: 11,         // owner + 10
    maxClients: 20,
    description: 'Para agencias en crecimiento',
    features: [
      'Owner + 10 usuarios',
      'Hasta 20 clientes',
      'Todo lo de Pro',
      'Portal del cliente',
      'Acceso API (Cowork)',
      'Grabaciones',
      'Auditorías',
      'Soporte prioritario',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 99,
    maxUsers: Infinity,
    maxClients: Infinity,
    description: 'Para agencias grandes',
    features: [
      'Usuarios ilimitados',
      'Clientes ilimitados',
      'Todo lo de Agency',
      'Onboarding personalizado',
      'Reportes white-label',
      'SLA garantizado',
    ],
  },
  // Legacy — solo compatibilidad con cuentas antiguas
  {
    id: 'starter',
    name: 'Starter',
    price: 12,
    maxUsers: 4,
    maxClients: 10,
    description: 'Legacy',
    features: ['4 usuarios', '10 clientes'],
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
