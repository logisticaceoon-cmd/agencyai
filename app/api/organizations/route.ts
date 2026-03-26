import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/org'
import { getPlanLimits, generateSlug } from '@/lib/plans'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).optional(),
  plan: z.enum(['free', 'starter', 'pro', 'agency', 'scale']).optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export async function GET() {
  const ctx = await getAuthContext()
  if ('error' in ctx) return ctx.error

  const orgs = await prisma.organizationMember.findMany({
    where: { userId: ctx.user.id, status: 'active' },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: orgs.map((m) => m.organization) })
}

export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const planId = (data.plan ?? 'free') as 'free' | 'starter' | 'pro' | 'agency' | 'scale'
    const limits = getPlanLimits(planId)

    // Generate unique slug
    let slug = data.slug ?? generateSlug(data.name)
    const existingSlug = await prisma.organization.findUnique({ where: { slug } })
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Create org + make user admin in a transaction
    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: data.name,
          slug,
          ownerId: ctx.user.id,
          plan: planId,
          maxUsers: limits.maxUsers,
          maxClients: limits.maxClients,
          industry: data.industry,
          country: data.country,
          currency: data.currency ?? 'USD',
          website: data.website || undefined,
        },
      })

      await tx.organizationMember.create({
        data: {
          organizationId: newOrg.id,
          userId: ctx.user.id,
          role: 'admin',
          status: 'active',
        },
      })

      return newOrg
    })

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[POST /api/organizations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
