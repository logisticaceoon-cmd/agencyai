import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected', 'review']).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  deadline: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  assignedTo: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  department: z.string().optional(),
  taskType: z.string().optional(),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const task = await prisma.task.findUnique({
      where: { id, organizationId: ctx.org.id },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        validatedBy: { select: { id: true, fullName: true } },
        subtasks: {
          include: {
            createdBy: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true, subtasks: true } },
        activityLog: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Trafficker can only see their own tasks
    if (ctx.membership.role === 'trafficker' && !task.assignedTo.includes(ctx.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: task })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const task = await prisma.task.findUnique({
      where: { id, organizationId: ctx.org.id },
    })
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Trafficker can only update their own tasks
    if (ctx.membership.role === 'trafficker' && !task.assignedTo.includes(ctx.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    // Build update payload
    const updateData: Record<string, unknown> = { ...data }
    if (data.deadline) {
      updateData.deadline = new Date(data.deadline)
    }
    if (data.projectId === '') {
      updateData.projectId = null
    }
    if (data.clientId === '') {
      updateData.clientId = null
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        actionType: 'task_updated',
        entityType: 'task',
        entityId: id,
        taskId: id,
        description: `Tarea actualizada: ${updated.title}`,
        changes: JSON.parse(JSON.stringify(data)),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    // Only admin can delete tasks
    if (ctx.membership.role === 'trafficker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const task = await prisma.task.findUnique({
      where: { id, organizationId: ctx.org.id },
    })
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Soft delete: mark as rejected with a note
    await prisma.task.update({
      where: { id },
      data: { status: 'rejected' },
    })

    await prisma.activityLog.create({
      data: {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        actionType: 'task_deleted',
        entityType: 'task',
        entityId: id,
        taskId: id,
        description: `Tarea eliminada: ${task.title}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
