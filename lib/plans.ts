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

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    maxUsers: 1,
    maxClients: 2,
    description: 'Para comenzar a explorar',
    features: [
      '1 usuario',
      '2 clientes',
      'Dashboard básico',
      'Tareas y reportes',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 12,
    maxUsers: 4,
    maxClients: 5,
    description: 'Para freelancers y equipos pequeños',
    features: [
      '4 usuarios',
      '5 clientes',
      'CRM de clientes',
      'Tareas y proyectos',
      'Reportes y minutas',
      'Documentos',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    maxUsers: 6,
    maxClients: 10,
    description: 'Para agencias en crecimiento',
    features: [
      '6 usuarios',
      '10 clientes',
      'Todo Starter',
      'Módulo de finanzas',
      'KPIs y métricas',
      'Objetivos',
      'Auditorías',
    ],
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 99,
    maxUsers: 10,
    maxClients: 20,
    description: 'Para agencias establecidas',
    features: [
      '10 usuarios',
      '20 clientes',
      'Todo Pro',
      'Portal cliente',
      'Alertas IA',
      'Grabaciones',
      'Invitaciones ilimitadas',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 149,
    maxUsers: 20,
    maxClients: 40,
    description: 'Para agencias grandes',
    features: [
      '20 usuarios',
      '40 clientes',
      'Todo Agency',
      'Soporte prioritario',
      'Onboarding dedicado',
      'Integraciones avanzadas',
      'API access',
    ],
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}
