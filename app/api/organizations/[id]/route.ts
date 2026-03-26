import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org'
import { getPlanLimits } from '@/lib/plans'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().optional(),
  plan: z.enum(['free', 'starter', 'pro', 'agency', 'scale']).optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params
  if (ctx.org.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true, role: true } } },
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { clients: true, tasks: true, reports: true } },
    },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: org })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params
  if (ctx.org.id !== id || ctx.membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.plan) {
      const limits = getPlanLimits(data.plan)
      updateData.maxUsers = limits.maxUsers
      updateData.maxClients = limits.maxClients
    }

    const org = await prisma.organization.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: org })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
