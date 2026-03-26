import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { notifyReportSubmitted } from '@/lib/notifications'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  reportType: z.enum(['task_completion', 'change', 'issue', 'insight', 'client_update', 'monthly', 'weekly']),
  clientId: z.string().optional(),
  taskId: z.string().optional(),
  fileUrls: z.array(z.string()).default([]),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  tags: z.array(z.string()).default([]),
  investment: z.number().optional(),
  sales: z.number().optional(),
  roas: z.number().optional(),
  previousSales: z.number().optional(),
  nextMonthPlan: z.string().optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const reportType = searchParams.get('reportType')
  const clientId = searchParams.get('clientId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Record<string, unknown> = { organizationId: ctx.org.id }

  if (ctx.membership.role === 'trafficker') {
    where.submittedById = ctx.user.id
  }

  if (status) where.status = status
  if (reportType) where.reportType = reportType
  if (clientId) where.clientId = clientId

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, fullName: true, avatarUrl: true } },
        client: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        validatedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({ where }),
  ])

  return NextResponse.json({ data: reports, total, page, limit, hasMore: page * limit < total })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const growthPct =
      data.sales && data.previousSales && data.previousSales > 0
        ? ((data.sales - data.previousSales) / data.previousSales) * 100
        : undefined

    const report = await prisma.report.create({
      data: {
        organizationId: ctx.org.id,
        title: data.title,
        description: data.description,
        submittedById: ctx.user.id,
        reportType: data.reportType,
        clientId: data.clientId,
        taskId: data.taskId,
        fileUrls: data.fileUrls,
        priority: data.priority,
        tags: data.tags,
        investment: data.investment,
        sales: data.sales,
        roas: data.roas,
        previousSales: data.previousSales,
        growthPct,
        nextMonthPlan: data.nextMonthPlan,
      },
      include: {
        submittedBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        actionType: 'report_submitted',
        entityType: 'report',
        entityId: report.id,
        reportId: report.id,
        description: `Reporte enviado: ${report.title}`,
      },
    })

    // Notify admins
    const adminMembers = await prisma.organizationMember.findMany({
      where: { organizationId: ctx.org.id, role: 'admin', status: 'active' },
      select: { userId: true },
    })
    const adminIds = adminMembers.map((m) => m.userId).filter((id) => id !== ctx.user.id)
    if (adminIds.length > 0) {
      await notifyReportSubmitted(report.id, report.title, adminIds, ctx.user.fullName)
    }

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
