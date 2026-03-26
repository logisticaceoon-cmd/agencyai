import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'trafficker', 'client']).default('trafficker'),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params
  if (ctx.org.id !== id || ctx.membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check user limit
  const memberCount = await prisma.organizationMember.count({
    where: { organizationId: id, status: 'active' },
  })
  if (memberCount >= ctx.org.maxUsers) {
    return NextResponse.json({
      error: `Plan limit reached. Upgrade to add more users (current limit: ${ctx.org.maxUsers})`,
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { email, role } = schema.parse(body)

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: { organizationId: id, userId: existingUser.id },
      })
      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
      }
    }

    // Create or update invitation
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: id,
        email,
        role,
        expiresAt,
      },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`

    // TODO: Send email via Resend
    // For now, return the invite URL so admin can share it manually
    return NextResponse.json({
      data: invitation,
      inviteUrl,
      message: 'Invitation created. Share the link with the user.',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params
  if (ctx.org.id !== id || ctx.membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invitations = await prisma.invitation.findMany({
    where: { organizationId: id, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: invitations })
}
