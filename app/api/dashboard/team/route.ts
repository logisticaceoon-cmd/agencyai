import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.org.id, status: 'active' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })

  const teamStatus = await Promise.all(
    members.map(async ({ user }) => {
      const [assigned, completed] = await Promise.all([
        prisma.task.count({
          where: {
            organizationId: ctx.org.id,
            assignedTo: { has: user.id },
            status: { in: ['pending', 'in_progress'] },
          },
        }),
        prisma.task.count({
          where: {
            organizationId: ctx.org.id,
            assignedTo: { has: user.id },
            status: 'completed',
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ])

      const workloadPercent = Math.min(Math.round((assigned / 8) * 100), 100)
      const status =
        workloadPercent >= 95 ? 'overloaded' : workloadPercent >= 75 ? 'monitor' : 'on_track'

      return { user, tasksAssigned: assigned, tasksCompleted: completed, workloadPercent, status }
    })
  )

  return NextResponse.json({ team: teamStatus })
}
