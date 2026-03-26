import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().optional(),
  date: z.string(),
  attendees: z.array(z.string()).default([]),
  summary: z.string().optional(),
  decisions: z.string().optional(),
  agreedTasks: z.array(z.object({
    title: z.string(),
    assignedTo: z.string().optional(),
    deadline: z.string().optional(),
  })).optional(),
  nextMeetingDate: z.string().optional(),
  notes: z.string().optional(),
  fileUrls: z.array(z.string()).default([]),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (clientId) where.clientId = clientId

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ data: meetings })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: ctx.org.id,
        title: data.title,
        clientId: data.clientId || undefined,
        date: new Date(data.date),
        attendees: data.attendees,
        summary: data.summary,
        decisions: data.decisions,
        agreedTasks: data.agreedTasks ?? undefined,
        nextMeetingDate: data.nextMeetingDate ? new Date(data.nextMeetingDate) : undefined,
        notes: data.notes,
        fileUrls: data.fileUrls,
        createdById: ctx.user.id,
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    })

    // Auto-create tasks from agreed tasks
    if (data.agreedTasks && data.agreedTasks.length > 0) {
      for (const t of data.agreedTasks) {
        if (t.title) {
          await prisma.task.create({
            data: {
              organizationId: ctx.org.id,
              title: t.title,
              description: `Tarea creada desde minuta: ${data.title}`,
              createdById: ctx.user.id,
              assignedTo: t.assignedTo ? [t.assignedTo] : [ctx.user.id],
              deadline: t.deadline ? new Date(t.deadline) : undefined,
              clientId: data.clientId || undefined,
              taskType: 'reunión',
              priority: 'medium',
            },
          })
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        actionType: 'meeting_created',
        entityType: 'meeting',
        entityId: meeting.id,
        description: `Minuta creada: ${meeting.title}`,
      },
    })

    return NextResponse.json({ data: meeting }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
