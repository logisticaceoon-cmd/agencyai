import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/**
 * Tests de validacion de schemas Zod usados en los API routes.
 * Se re-definen aqui basados en los schemas de las rutas para evitar
 * importar modulos con dependencias de servidor (Next.js, Supabase).
 */

// Schema de clientes (basado en app/api/clients/route.ts)
const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  brand: z.string().optional(),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(['active', 'inactive', 'lead', 'churned']).optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  monthlyFee: z.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  percentage_value: z.number().min(0).max(100).optional().nullable(),
})

// Schema de proyectos (basado en app/api/projects/route.ts)
const createProjectSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  clientId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  color: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  ownerId: z.string().optional(),
})

// Schema de tareas (basado en app/api/tasks/route.ts)
const createTaskSchema = z.object({
  title: z.string().min(1, 'El titulo es obligatorio'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  deadline: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  parent_task_id: z.string().optional().nullable(),
  assignedTo: z.array(z.string()).optional(),
})

// Schema de finanzas (basado en app/api/finances/route.ts)
const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().min(1),
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  currency: z.string().optional(),
  category: z.string().optional().nullable(),
  date: z.string().optional(),
})

// Schema de reportes (basado en app/api/reports/route.ts)
const createReportSchema = z.object({
  title: z.string().min(1, 'El titulo es obligatorio'),
  clientId: z.string().optional().nullable(),
  reportType: z.enum(['monthly', 'weekly', 'quarterly', 'custom']).optional(),
  description: z.string().optional().nullable(),
})

describe('Schema de clientes', () => {
  it('acepta cliente valido minimo', () => {
    const result = createClientSchema.safeParse({ name: 'Acme' })
    expect(result.success).toBe(true)
  })

  it('rechaza cliente sin nombre', () => {
    const result = createClientSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rechaza nombre vacio', () => {
    const result = createClientSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rechaza email invalido', () => {
    const result = createClientSchema.safeParse({ name: 'Test', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('acepta email vacio', () => {
    const result = createClientSchema.safeParse({ name: 'Test', email: '' })
    expect(result.success).toBe(true)
  })

  it('rechaza status invalido', () => {
    const result = createClientSchema.safeParse({ name: 'Test', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rechaza monthlyFee negativo', () => {
    const result = createClientSchema.safeParse({ name: 'Test', monthlyFee: -100 })
    expect(result.success).toBe(false)
  })

  it('rechaza percentage_value mayor a 100', () => {
    const result = createClientSchema.safeParse({ name: 'Test', percentage_value: 150 })
    expect(result.success).toBe(false)
  })
})

describe('Schema de proyectos', () => {
  it('acepta proyecto valido minimo', () => {
    const result = createProjectSchema.safeParse({ name: 'Proyecto X' })
    expect(result.success).toBe(true)
  })

  it('rechaza proyecto sin nombre', () => {
    const result = createProjectSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rechaza status invalido', () => {
    const result = createProjectSchema.safeParse({ name: 'Test', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rechaza budget negativo', () => {
    const result = createProjectSchema.safeParse({ name: 'Test', budget: -500 })
    expect(result.success).toBe(false)
  })

  it('acepta todos los campos opcionales', () => {
    const result = createProjectSchema.safeParse({
      name: 'Full Project',
      clientId: 'abc-123',
      description: 'Descripcion',
      status: 'active',
      color: '#FF0000',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      budget: 10000,
    })
    expect(result.success).toBe(true)
  })
})

describe('Schema de tareas', () => {
  it('acepta tarea valida minima', () => {
    const result = createTaskSchema.safeParse({ title: 'Mi tarea' })
    expect(result.success).toBe(true)
  })

  it('rechaza tarea sin titulo', () => {
    const result = createTaskSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rechaza priority invalido', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', priority: 'critical' })
    expect(result.success).toBe(false)
  })

  it('acepta assignedTo como array de strings', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', assignedTo: ['user-1', 'user-2'] })
    expect(result.success).toBe(true)
  })
})

describe('Schema de transacciones', () => {
  it('acepta transaccion valida', () => {
    const result = createTransactionSchema.safeParse({
      type: 'income',
      amount: 1000,
      description: 'Pago cliente',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza sin tipo', () => {
    const result = createTransactionSchema.safeParse({ amount: 100, description: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rechaza tipo invalido', () => {
    const result = createTransactionSchema.safeParse({ type: 'refund', amount: 100, description: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rechaza amount 0 o negativo', () => {
    const result1 = createTransactionSchema.safeParse({ type: 'income', amount: 0, description: 'Test' })
    expect(result1.success).toBe(false)

    const result2 = createTransactionSchema.safeParse({ type: 'expense', amount: -50, description: 'Test' })
    expect(result2.success).toBe(false)
  })

  it('rechaza description vacia', () => {
    const result = createTransactionSchema.safeParse({ type: 'income', amount: 100, description: '' })
    expect(result.success).toBe(false)
  })
})

describe('Schema de reportes', () => {
  it('acepta reporte valido minimo', () => {
    const result = createReportSchema.safeParse({ title: 'Reporte Q1' })
    expect(result.success).toBe(true)
  })

  it('rechaza reporte sin titulo', () => {
    const result = createReportSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rechaza reportType invalido', () => {
    const result = createReportSchema.safeParse({ title: 'Test', reportType: 'annual' })
    expect(result.success).toBe(false)
  })

  it('acepta todos los reportType validos', () => {
    for (const type of ['monthly', 'weekly', 'quarterly', 'custom']) {
      const result = createReportSchema.safeParse({ title: 'Test', reportType: type })
      expect(result.success).toBe(true)
    }
  })
})
