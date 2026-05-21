/**
 * Sistema de roles y permisos — AgencyAI
 * Define qué ve y qué puede hacer cada rol en la plataforma
 */

export type AppRole = 'owner' | 'admin' | 'trafficker' | 'viewer'

// ─── Jerarquía de roles ─────────────────────────────────────────────────────
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 4,
  admin: 3,
  trafficker: 2,
  viewer: 1,
}

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Dueño',
  admin: 'Admin',
  trafficker: 'Trafficker',
  viewer: 'Solo lectura',
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  owner: 'Acceso total. Ve finanzas, equipo, configuración y toda la agencia.',
  admin: 'Acceso operativo completo. Sin acceso a billing.',
  trafficker: 'Ve sus clientes, campañas, tareas, KPIs y reportes asignados.',
  viewer: 'Solo puede ver reportes y KPIs. Sin edición.',
}

// ─── Permisos por sección del sidebar ────────────────────────────────────────
/**
 * Para cada ruta, los roles que tienen acceso.
 * Si no está en el mapa → solo 'owner' tiene acceso.
 */
export const SECTION_PERMISSIONS: Record<string, AppRole[]> = {
  '/dashboard':   ['owner', 'admin', 'trafficker', 'viewer'],
  '/clients':     ['owner', 'admin', 'trafficker'],
  '/projects':    ['owner', 'admin', 'trafficker'],
  '/tasks':       ['owner', 'admin', 'trafficker'],
  '/minutes':     ['owner', 'admin', 'trafficker'],
  '/calendar':    ['owner', 'admin', 'trafficker'],
  '/reports':     ['owner', 'admin', 'trafficker', 'viewer'],
  '/kpis':        ['owner', 'admin', 'trafficker', 'viewer'],
  '/objectives':  ['owner', 'admin', 'trafficker'],
  '/audits':      ['owner', 'admin'],
  '/performance': ['owner', 'admin'],
  '/docs':        ['owner', 'admin', 'trafficker'],
  '/finances':    ['owner', 'admin'],
  '/recordings':  ['owner', 'admin'],
  '/alerts':      ['owner', 'admin'],
  '/settings':           ['owner'],
  '/settings/account':   ['owner', 'admin', 'trafficker', 'viewer'],
  '/settings/team':      ['owner', 'admin'],
  '/settings/billing':   ['owner'],
  '/settings/workspace': ['owner'],
  '/settings/api-keys':  ['owner'],
  '/settings/roles':     ['owner'],
}

// ─── Permisos de datos (filtrado en API) ─────────────────────────────────────
/**
 * Qué data filtrar por rol en las APIs.
 * 'all'      → ve todo el workspace
 * 'assigned' → solo registros donde assigned_to = userId
 */
export type DataScope = 'all' | 'assigned'

export const DATA_SCOPE: Record<string, Partial<Record<AppRole, DataScope>>> = {
  tasks: {
    owner:      'all',
    admin:      'all',
    trafficker: 'assigned',
    viewer:     'assigned',
  },
  kpis: {
    owner:      'all',
    admin:      'all',
    trafficker: 'assigned',
    viewer:     'assigned',
  },
  objectives: {
    owner:      'all',
    admin:      'all',
    trafficker: 'assigned',
    viewer:     'assigned',
  },
  projects: {
    owner:      'all',
    admin:      'all',
    trafficker: 'assigned',
    viewer:     'assigned',
  },
  clients: {
    owner:      'all',
    admin:      'all',
    trafficker: 'assigned',
    viewer:     'assigned',
  },
  reports: {
    owner:      'all',
    admin:      'all',
    trafficker: 'assigned',
    viewer:     'assigned',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normaliza roles legacy ('member', 'CEO', etc.) al nuevo sistema */
export function normalizeRole(raw: string | null | undefined): AppRole {
  if (!raw) return 'viewer'
  const r = raw.toLowerCase()
  if (r === 'owner') return 'owner'
  if (r === 'admin' || r === 'ceo' || r === 'manager') return 'admin'
  if (r === 'trafficker' || r === 'member' || r === 'specialist') return 'trafficker'
  if (r === 'viewer' || r === 'client') return 'viewer'
  return 'viewer'
}

/** ¿Puede acceder este rol a esta sección? */
export function canAccessSection(role: AppRole, href: string): boolean {
  const allowed = SECTION_PERMISSIONS[href]
  if (!allowed) return role === 'owner' // default: solo owner
  return allowed.includes(role)
}

/** ¿Qué scope de data tiene este rol para este recurso? */
export function getDataScope(resource: string, role: AppRole): DataScope {
  return DATA_SCOPE[resource]?.[role] ?? 'assigned'
}

/** ¿Tiene este rol al menos el nivel mínimo requerido? */
export function hasMinRole(role: AppRole, minRole: AppRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}
