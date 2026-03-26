import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  serviceType: z
    .enum([
      'meta_ads',
      'google_ads',
      'landing_page',
      'ecommerce',
      'mentoring',
      'social_media',
      'seo',
      'email_marketing',
      'content',
      'design',
      'other',
    ])
    .optional(),
  status: z
    .enum(['onboarding', 'active', 'review', 'paused', 'completed'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  color: z.string().optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (clientId) where.clientId = clientId
  if (status) where.status = status

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, fullName: true } },
      _count: { select: { tasks: true } },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate task completion stats for each project
  const data = projects.map((p) => {
    const totalTasks = p.tasks.length
    const completedTasks = p.tasks.filter(
      (t) => t.status === 'completed'
    ).length
    const progressPercent =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const { tasks, ...rest } = p
    return {
      ...rest,
      totalTasks,
      completedTasks,
      progressPercent,
    }
  })

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        organizationId: ctx.org.id,
        name: data.name,
        description: data.description,
        clientId: data.clientId || undefined,
        managerId: data.managerId || undefined,
        serviceType: data.serviceType || undefined,
        status: data.status ?? 'active',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
