import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const orgId = ctx.org.id
  const now = new Date()

  const [
    totalClients,
    activeClients,
    tasksTotal,
    tasksCompleted,
    tasksOverdue,
    reportsTotal,
    reportsProcessed,
    reportsPending,
    audits,
    monthlyIncome,
    pendingPayments,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId: orgId } }),
    prisma.client.count({ where: { organizationId: orgId, status: 'active' } }),
    prisma.task.count({ where: { organizationId: orgId, status: { not: 'rejected' } } }),
    prisma.task.count({ where: { organizationId: orgId, status: 'completed' } }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: { in: ['pending', 'in_progress'] },
        deadline: { lt: now },
      },
    }),
    prisma.report.count({ where: { organizationId: orgId } }),
    prisma.report.count({
      where: { organizationId: orgId, status: { in: ['validated', 'rejected'] } },
    }),
    prisma.report.count({ where: { organizationId: orgId, status: 'pending' } }),
    prisma.audit.findMany({
      where: { organizationId: orgId, status: 'completed', complianceScore: { not: null } },
      select: { complianceScore: true },
      orderBy: { executedAt: 'desc' },
      take: 10,
    }),
    prisma.finance.aggregate({
      where: {
        organizationId: orgId,
        type: 'income',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      _sum: { amount: true },
    }),
    prisma.finance.count({
      where: { organizationId: orgId, type: 'income', isPaid: false },
    }),
  ])

  const complianceScore =
    audits.length > 0
      ? Math.round(audits.reduce((sum, a) => sum + (a.complianceScore ?? 0), 0) / audits.length)
      : 0

  return NextResponse.json({
    totalClients,
    clientsOnTrack: activeClients,
    tasksTotal,
    tasksCompleted,
    tasksOverdue,
    reportsTotal,
    reportsProcessed,
    reportsPending,
    complianceScore,
    monthlyRevenue: Number(monthlyIncome._sum.amount ?? 0),
    pendingPayments,
  })
}
