import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const orgId = ctx.org.id
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [overdueTasks, pendingReports, overdueReports] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        deadline: { lt: now },
        status: { in: ['pending', 'in_progress'] },
      },
      select: { id: true, title: true, deadline: true, assignedTo: true, priority: true },
      orderBy: { deadline: 'asc' },
      take: 10,
    }),
    prisma.report.findMany({
      where: { organizationId: orgId, status: 'pending', createdAt: { lt: yesterday } },
      select: { id: true, title: true, createdAt: true },
      take: 10,
    }),
    prisma.report.count({
      where: { organizationId: orgId, status: 'pending', createdAt: { lt: yesterday } },
    }),
  ])

  return NextResponse.json({ overdueTasks, pendingReports, overdueReportsCount: overdueReports })
}
