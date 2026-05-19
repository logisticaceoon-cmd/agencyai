/**
 * db-columns.ts
 * =============
 * REFERENCIA OFICIAL de nombres de columnas en Supabase.
 *
 * REGLA DE ORO:
 *   - Columnas originales de Prisma → camelCase  (ej: createdAt, clientId)
 *   - Columnas agregadas en Supabase → snake_case (ej: workspace_id, deleted_at)
 *
 * ANTES de usar cualquier nombre de columna en un query Supabase (.select,
 * .eq, .order, .lt, .gte, .is), buscá el nombre correcto aquí.
 *
 * ⚠️  NUNCA asumir — siempre verificar.
 */

// ─── Columnas compartidas (presentes en casi todas las tablas) ────────────
export const SHARED = {
  // camelCase (Prisma original)
  id:             'id',
  createdAt:      'createdAt',
  updatedAt:      'updatedAt',
  organizationId: 'organizationId',

  // snake_case (agregadas en Supabase)
  workspace_id:   'workspace_id',
  deleted_at:     'deleted_at',
} as const

// ─── clients ─────────────────────────────────────────────────────────────
export const CLIENTS_COLS = {
  ...SHARED,
  // camelCase
  accountManagerId: 'accountManagerId',
  paymentStatus:    'paymentStatus',
  // snake_case
  // (ninguna adicional)
} as const

// ─── tasks ───────────────────────────────────────────────────────────────
export const TASKS_COLS = {
  ...SHARED,
  // camelCase (Prisma)
  clientId:          'clientId',
  projectId:         'projectId',
  createdById:       'createdById',
  assignedTo:        'assignedTo',
  progressPercent:   'progressPercent',
  estimatedHours:    'estimatedHours',
  actualHours:       'actualHours',
  taskType:          'taskType',
  isRecurring:       'isRecurring',
  recurrencePattern: 'recurrencePattern',
  parentTaskId:      'parentTaskId',
  validatedById:     'validatedById',
  validatedAt:       'validatedAt',
  validationNotes:   'validationNotes',
  // Columna de fecha/deadline — NO es "due_date", es "deadline"
  deadline:          'deadline',
  // snake_case (agregadas en Supabase)
  assignee_id:       'assignee_id',
  parent_task_id:    'parent_task_id',
} as const

// ─── projects ────────────────────────────────────────────────────────────
export const PROJECTS_COLS = {
  ...SHARED,
  // camelCase (Prisma)
  clientId:    'clientId',
  managerId:   'managerId',
  serviceType: 'serviceType',
  startDate:   'startDate',  // NO es "start_date"
  endDate:     'endDate',    // NO es "end_date" ni "due_date"
  // snake_case (agregadas)
  owner_id:    'owner_id',
  budget_spent:'budget_spent',
} as const

// ─── notifications ───────────────────────────────────────────────────────
export const NOTIFICATIONS_COLS = {
  ...SHARED,
  // camelCase
  userId:            'userId',       // también existe user_id (snake_case)
  relatedEntityType: 'relatedEntityType',
  relatedEntityId:   'relatedEntityId',
  readAt:            'readAt',
  deliveredAt:       'deliveredAt',
  expiresAt:         'expiresAt',
  // snake_case
  user_id:           'user_id',
} as const

// ─── Guía de errores comunes ──────────────────────────────────────────────
/**
 * ❌ INCORRECTO → ✅ CORRECTO
 *
 * created_at    → createdAt
 * updated_at    → updatedAt
 * client_id     → clientId      (en tasks/projects)
 * project_id    → projectId     (en tasks)
 * due_date      → deadline      (en tasks)
 * start_date    → startDate     (en projects)
 * end_date      → endDate       (en projects)
 * owner_id      → owner_id      ✓ correcto (snake_case)
 * workspace_id  → workspace_id  ✓ correcto (snake_case)
 * deleted_at    → deleted_at    ✓ correcto (snake_case)
 * assignee_id   → assignee_id   ✓ correcto (snake_case)
 */
