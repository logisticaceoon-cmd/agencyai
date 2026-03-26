import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  processName: z.string().min(1),
  auditedUsers: z.array(z.string()).min(1),
  clientId: z.string().optional(),
  auditFrom: z.string(),
  auditTo: z.string(),
  checklistItems: z.array(z.string()).default([]),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (status) where.status = status

  const [audits, total] = await Promise.all([
    prisma.audit.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.audit.count({ where }),
  ])

  return NextResponse.json({ data: audits, total, page, limit, hasMore: page * limit < total })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  if (ctx.membership.role === 'trafficker') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const checklistTemplate = data.checklistItems.map((item) => ({
      item,
      result: null,
      notes: '',
    }))

    const audit = await prisma.audit.create({
      data: {
        organizationId: ctx.org.id,
        title: data.title,
        processName: data.processName,
        auditedUsers: data.auditedUsers,
        clientId: data.clientId,
        auditFrom: new Date(data.auditFrom),
        auditTo: new Date(data.auditTo),
        createdById: ctx.user.id,
        findings: { checklist: checklistTemplate },
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    })

    return NextResponse.json({ data: audit }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
