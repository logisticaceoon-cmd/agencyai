import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().optional(),
  meetingId: z.string().optional(),
  url: z.string().optional(),
  platform: z.string().optional(),
  duration: z.number().optional(),
  transcription: z.string().optional(),
  extractedTasks: z.array(z.object({
    title: z.string(),
    assignedTo: z.string().optional(),
  })).optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (clientId) where.clientId = clientId

  const recordings = await prisma.recording.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: recordings })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const recording = await prisma.recording.create({
      data: {
        organizationId: ctx.org.id,
        title: data.title,
        clientId: data.clientId || undefined,
        meetingId: data.meetingId || undefined,
        url: data.url,
        platform: data.platform,
        duration: data.duration,
        transcription: data.transcription,
        extractedTasks: data.extractedTasks ?? undefined,
        createdById: ctx.user.id,
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ data: recording }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
