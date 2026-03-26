import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  decisions: z.string().optional(),
  agreedTasks: z.array(z.object({
    title: z.string(),
    assignedTo: z.string().optional(),
    deadline: z.string().optional(),
  })).optional(),
  nextMeetingDate: z.string().optional(),
  notes: z.string().optional(),
  attendees: z.array(z.string()).optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  })

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: meeting })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...data,
        nextMeetingDate: data.nextMeetingDate ? new Date(data.nextMeetingDate) : undefined,
        agreedTasks: data.agreedTasks ?? undefined,
      },
    })

    return NextResponse.json({ data: meeting })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
