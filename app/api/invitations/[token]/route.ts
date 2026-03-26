import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/org'

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true, logoUrl: true, plan: true } } },
  })

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (invitation.acceptedAt) return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

  return NextResponse.json({ data: invitation })
}

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return ctx.error

  const { token } = await params

  const invitation = await prisma.invitation.findUnique({ where: { token } })
  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (invitation.acceptedAt) return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

  // Verify email matches (optional strict check)
  if (invitation.email !== ctx.user.email) {
    return NextResponse.json({ error: 'This invitation is for a different email address' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    // Add user to org
    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: ctx.user.id,
        },
      },
      create: {
        organizationId: invitation.organizationId,
        userId: ctx.user.id,
        role: invitation.role,
        status: 'active',
      },
      update: { status: 'active', role: invitation.role },
    })

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    })
  })

  return NextResponse.json({ message: 'Invitation accepted', organizationId: invitation.organizationId })
}
