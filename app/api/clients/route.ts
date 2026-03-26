import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  contactPerson: z.string().optional(),
  accountManagerId: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  monthlyFee: z.number().optional(),
  commissionPct: z.number().optional(),
  serviceType: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  status: z.enum(['active', 'paused', 'inactive', 'onboarding', 'risk', 'scaling']).optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (status) where.status = status

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      accountManager: { select: { id: true, fullName: true } },
      _count: { select: { tasks: true, reports: true, projects: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ data: clients })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  // Check client limit
  const clientCount = await prisma.client.count({ where: { organizationId: ctx.org.id } })
  if (clientCount >= ctx.org.maxClients) {
    return NextResponse.json({
      error: `Plan limit reached. Upgrade to add more clients (current limit: ${ctx.org.maxClients})`,
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const client = await prisma.client.create({
      data: {
        organizationId: ctx.org.id,
        name: data.name,
        brand: data.brand,
        email: data.email || undefined,
        phone: data.phone,
        whatsapp: data.whatsapp,
        contactPerson: data.contactPerson,
        accountManagerId: data.accountManagerId,
        industry: data.industry,
        website: data.website,
        country: data.country,
        currency: data.currency ?? 'USD',
        notes: data.notes,
        monthlyFee: data.monthlyFee,
        commissionPct: data.commissionPct,
        serviceType: data.serviceType,
        contractStart: data.contractStart ? new Date(data.contractStart) : undefined,
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : undefined,
        status: data.status ?? 'active',
      },
    })

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
