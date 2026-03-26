import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  // Return all users in this organization
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.org.id, status: 'active' },
    include: {
      user: {
        select: {
          id: true, fullName: true, email: true, role: true,
          department: true, avatarUrl: true, status: true, lastLogin: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const users = members.map((m) => ({ ...m.user, orgRole: m.role }))

  return NextResponse.json({ data: users })
}
