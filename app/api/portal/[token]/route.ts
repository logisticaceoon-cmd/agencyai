import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Client portal - public access via unique client token.
 * Returns client overview: metrics, recent reports, meetings, tasks.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Find client by id (in production, use a separate portal token)
  const client = await prisma.client.findUnique({
    where: { id: token },
    include: {
      accountManager: { select: { fullName: true, email: true, avatarUrl: true } },
    },
  })

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [kpis, reports, meetings, completedTasks, pendingTasks] = await Promise.all([
    prisma.kPI.findMany({
      where: { clientId: client.id, organizationId: client.organizationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    }),
    prisma.report.findMany({
      where: { clientId: client.id, organizationId: client.organizationId, sentToClient: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, reportType: true, createdAt: true,
        investment: true, sales: true, roas: true, growthPct: true,
        nextMonthPlan: true, description: true,
      },
    }),
    prisma.meeting.findMany({
      where: { clientId: client.id, organizationId: client.organizationId },
      orderBy: { date: 'desc' },
      take: 5,
      select: {
        id: true, title: true, date: true, summary: true, decisions: true,
        nextMeetingDate: true,
      },
    }),
    prisma.task.count({
      where: { clientId: client.id, organizationId: client.organizationId, status: 'completed' },
    }),
    prisma.task.count({
      where: { clientId: client.id, organizationId: client.organizationId, status: { in: ['pending', 'in_progress'] } },
    }),
  ])

  const currentKpi = kpis.find(k => k.month === currentMonth && k.year === currentYear) || kpis[0]

  return NextResponse.json({
    data: {
      client: {
        name: client.name,
        brand: client.brand,
        status: client.status,
        accountManager: client.accountManager,
        serviceType: client.serviceType,
      },
      metrics: currentKpi ? {
        investment: Number(currentKpi.investment),
        sales: Number(currentKpi.sales),
        roas: Number(currentKpi.roas),
        cpa: Number(currentKpi.cpa),
        conversions: currentKpi.conversions,
        growthPct: Number(currentKpi.growthPct),
      } : null,
      kpiHistory: kpis.map(k => ({
        month: k.month,
        year: k.year,
        investment: Number(k.investment),
        sales: Number(k.sales),
        roas: Number(k.roas),
      })),
      reports,
      meetings,
      tasksSummary: { completed: completedTasks, pending: pendingTasks },
    },
  })
}
