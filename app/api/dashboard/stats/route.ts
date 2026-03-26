import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const orgId = ctx.org.id
  const now = new Date()

  // Start of the current week (Monday)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)

  const [
    activeClients,
    activeProjects,
    tasksCompletedThisWeek,
    tasksOverdue,
    pendingTasks,
    recentClients,
    totalClients,
  ] = await Promise.all([
    prisma.client.count({
      where: { organizationId: orgId, status: 'active' },
    }),
    prisma.project.count({
      where: { organizationId: orgId, status: 'active' },
    }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: 'completed',
        updatedAt: { gte: startOfWeek },
      },
    }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: { in: ['pending', 'in_progress'] },
        deadline: { lt: now },
      },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['pending', 'in_progress', 'review'] },
        deadline: { not: null },
      },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        priority: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 5,
    }),
    prisma.client.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.client.count({
      where: { organizationId: orgId },
    }),
  ])

  return NextResponse.json({
    activeClients,
    activeProjects,
    tasksCompletedThisWeek,
    tasksOverdue,
    pendingTasks,
    recentClients,
    totalClients,
  })
}
