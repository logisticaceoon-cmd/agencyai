import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createNotificationForMultiple } from '@/lib/notifications'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.array(z.string()).min(1),
  deadline: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected', 'review']).default('pending'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  taskType: z.string().optional(),
  estimatedHours: z.number().optional(),
  sopLink: z.string().optional(),
  parentTaskId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const clientId = searchParams.get('clientId')
  const projectId = searchParams.get('projectId')
  const assignedTo = searchParams.get('assignedTo')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }

  // Trafficker only sees their own tasks
  if (ctx.membership.role === 'trafficker') {
    where.assignedTo = { has: ctx.user.id }
  }

  if (status) where.status = status
  if (priority) where.priority = priority
  if (clientId) where.clientId = clientId
  if (projectId) where.projectId = projectId
  if (assignedTo) where.assignedTo = { has: assignedTo }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        validatedBy: { select: { id: true, fullName: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
      orderBy: [{ priority: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ])

  return NextResponse.json({ data: tasks, total, page, limit, hasMore: page * limit < total })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  if (ctx.membership.role === 'trafficker') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const task = await prisma.task.create({
      data: {
        organizationId: ctx.org.id,
        title: data.title,
        description: data.description,
        createdById: ctx.user.id,
        assignedTo: data.assignedTo,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        clientId: data.clientId || undefined,
        projectId: data.projectId || undefined,
        department: data.department,
        status: data.status,
        priority: data.priority,
        taskType: data.taskType,
        estimatedHours: data.estimatedHours,
        sopLink: data.sopLink,
        parentTaskId: data.parentTaskId || undefined,
        isRecurring: data.isRecurring,
        recurrencePattern: data.recurrencePattern,
        checklist: data.checklist ?? undefined,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        actionType: 'task_created',
        entityType: 'task',
        entityId: task.id,
        taskId: task.id,
        description: `Tarea creada: ${task.title}`,
      },
    })

    const assigneesExcludingCreator = data.assignedTo.filter((id) => id !== ctx.user.id)
    if (assigneesExcludingCreator.length > 0) {
      await createNotificationForMultiple(assigneesExcludingCreator, {
        title: 'Nueva tarea asignada',
        message: `${ctx.user.fullName} te asigno: ${task.title}`,
        type: 'task',
        relatedEntityType: 'task',
        relatedEntityId: task.id,
      })
    }

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
