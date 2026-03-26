import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  clientId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
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
    .nullable()
    .optional(),
  status: z
    .enum(['onboarding', 'active', 'review', 'paused', 'completed'])
    .optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  color: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, fullName: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          deadline: true,
          assignedTo: true,
          progressPercent: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const totalTasks = project.tasks.length
  const completedTasks = project.tasks.filter(
    (t) => t.status === 'completed'
  ).length
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return NextResponse.json({
    data: {
      ...project,
      totalTasks,
      completedTasks,
      progressPercent,
    },
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  // Verify project belongs to org
  const existing = await prisma.project.findFirst({
    where: { id, organizationId: ctx.org.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.managerId !== undefined && { managerId: data.managerId }),
        ...(data.serviceType !== undefined && {
          serviceType: data.serviceType,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ data: project })
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: ctx.org.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Soft delete: set status to completed (no deletedAt field in schema)
  await prisma.project.update({
    where: { id },
    data: { status: 'completed' },
  })

  return NextResponse.json({ success: true })
}
