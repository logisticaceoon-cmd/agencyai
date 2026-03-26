import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  contactPerson: z.string().optional(),
  accountManagerId: z.string().nullable().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  observations: z.string().optional(),
  monthlyFee: z.number().nullable().optional(),
  commissionPct: z.number().nullable().optional(),
  serviceType: z.string().optional(),
  contractStart: z.string().nullable().optional(),
  contractEnd: z.string().nullable().optional(),
  status: z.enum(['active', 'paused', 'inactive', 'onboarding', 'risk', 'scaling']).optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const client = await prisma.client.findFirst({
      where: { id, organizationId: ctx.org.id },
      include: {
        accountManager: { select: { id: true, fullName: true } },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { createdBy: { select: { id: true, fullName: true } } },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { submittedBy: { select: { id: true, fullName: true } } },
        },
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { createdBy: { select: { id: true, fullName: true } } },
        },
      },
    })

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: client })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    // Verify the client belongs to this org
    const existing = await prisma.client.findFirst({
      where: { id, organizationId: ctx.org.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check permission — only admin/trafficker with CEO/Manager role
    if (ctx.user.role === 'Team' && ctx.membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...data,
        email: data.email || undefined,
        contractStart: data.contractStart !== undefined
          ? (data.contractStart ? new Date(data.contractStart) : null)
          : undefined,
        contractEnd: data.contractEnd !== undefined
          ? (data.contractEnd ? new Date(data.contractEnd) : null)
          : undefined,
      },
    })

    return NextResponse.json({ data: client })
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

    // Verify the client belongs to this org
    const existing = await prisma.client.findFirst({
      where: { id, organizationId: ctx.org.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check permission
    if (ctx.user.role === 'Team' && ctx.membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete: set status to inactive
    const client = await prisma.client.update({
      where: { id },
      data: { status: 'inactive' },
    })

    return NextResponse.json({ data: client })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Keep backward compatibility with PATCH
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
}
