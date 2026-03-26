import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  const recording = await prisma.recording.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  })

  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: recording })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  try {
    const body = await request.json()
    const recording = await prisma.recording.update({
      where: { id },
      data: {
        title: body.title,
        url: body.url,
        platform: body.platform,
        duration: body.duration,
        transcription: body.transcription,
        extractedTasks: body.extractedTasks ?? undefined,
      },
    })

    return NextResponse.json({ data: recording })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
