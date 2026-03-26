import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(['sop', 'manual', 'template', 'process', 'reference', 'policy', 'contract', 'onboarding', 'legal', 'finances']),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  externalUrl: z.string().optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (category) where.category = category
  if (status) where.status = status
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
      { tags: { has: q } },
    ]
  }

  const docs = await prisma.documentation.findMany({
    where,
    include: { author: { select: { id: true, fullName: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ data: docs })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const doc = await prisma.documentation.create({
      data: { ...data, organizationId: ctx.org.id, authorId: ctx.user.id },
      include: { author: { select: { id: true, fullName: true } } },
    })

    return NextResponse.json({ data: doc }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
