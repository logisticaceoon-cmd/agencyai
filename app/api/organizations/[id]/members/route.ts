import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params
  if (ctx.org.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          role: true,
          department: true,
          status: true,
          lastLogin: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: members })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { id } = await params
  if (ctx.org.id !== id || ctx.membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Cannot remove the org owner
  if (ctx.org.ownerId === userId) {
    return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 403 })
  }

  await prisma.organizationMember.deleteMany({
    where: { organizationId: id, userId },
  })

  return NextResponse.json({ message: 'Member removed' })
}
