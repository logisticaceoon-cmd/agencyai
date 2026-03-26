import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

interface Alert {
  id: string
  type: 'warning' | 'danger' | 'info' | 'success'
  category: string
  title: string
  message: string
  entityType?: string
  entityId?: string
  clientName?: string
}

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const now = new Date()
  const alerts: Alert[] = []

  // 1. Overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      organizationId: ctx.org.id,
      status: { in: ['pending', 'in_progress'] },
      deadline: { lt: now },
    },
    include: { client: { select: { name: true } } },
  })
  for (const t of overdueTasks) {
    alerts.push({
      id: `task-overdue-${t.id}`,
      type: 'danger',
      category: 'Tareas atrasadas',
      title: t.title,
      message: `Tarea atrasada${t.client ? ` - ${t.client.name}` : ''}`,
      entityType: 'task',
      entityId: t.id,
      clientName: t.client?.name,
    })
  }

  // 2. Clients with low ROAS (< 2)
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const lowRoasKpis = await prisma.kPI.findMany({
    where: {
      organizationId: ctx.org.id,
      month: currentMonth,
      year: currentYear,
      roas: { lt: 2 },
      NOT: { roas: null },
    },
    include: { client: { select: { id: true, name: true } } },
  })
  for (const k of lowRoasKpis) {
    if (k.client) {
      alerts.push({
        id: `roas-low-${k.id}`,
        type: 'danger',
        category: 'ROAS bajo',
        title: `${k.client.name}: ROAS ${Number(k.roas).toFixed(2)}`,
        message: `ROAS por debajo de 2.0 este mes`,
        entityType: 'client',
        entityId: k.client.id,
        clientName: k.client.name,
      })
    }
  }

  // 3. Clients without tasks this week
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const activeClients = await prisma.client.findMany({
    where: { organizationId: ctx.org.id, status: 'active' },
    select: { id: true, name: true },
  })

  const clientsWithTasks = await prisma.task.findMany({
    where: {
      organizationId: ctx.org.id,
      createdAt: { gte: weekStart },
      clientId: { not: null },
    },
    select: { clientId: true },
    distinct: ['clientId'],
  })

  const clientIdsWithTasks = new Set(clientsWithTasks.map(t => t.clientId))
  for (const c of activeClients) {
    if (!clientIdsWithTasks.has(c.id)) {
      alerts.push({
        id: `no-tasks-${c.id}`,
        type: 'warning',
        category: 'Sin actividad',
        title: c.name,
        message: 'Sin tareas creadas esta semana',
        entityType: 'client',
        entityId: c.id,
        clientName: c.name,
      })
    }
  }

  // 4. Pending reports for current month
  const clientsWithReports = await prisma.report.findMany({
    where: {
      organizationId: ctx.org.id,
      reportType: 'monthly',
      createdAt: { gte: new Date(currentYear, currentMonth - 1, 1) },
      clientId: { not: null },
    },
    select: { clientId: true },
    distinct: ['clientId'],
  })

  const clientIdsWithReports = new Set(clientsWithReports.map(r => r.clientId))
  for (const c of activeClients) {
    if (!clientIdsWithReports.has(c.id)) {
      alerts.push({
        id: `no-report-${c.id}`,
        type: 'warning',
        category: 'Reportes pendientes',
        title: c.name,
        message: 'Sin reporte mensual este mes',
        entityType: 'client',
        entityId: c.id,
        clientName: c.name,
      })
    }
  }

  // 5. Pending payments
  const pendingPayments = await prisma.finance.findMany({
    where: {
      organizationId: ctx.org.id,
      type: 'income',
      isPaid: false,
      month: currentMonth,
      year: currentYear,
    },
    include: { client: { select: { name: true } } },
  })
  for (const p of pendingPayments) {
    alerts.push({
      id: `payment-pending-${p.id}`,
      type: 'warning',
      category: 'Pagos pendientes',
      title: `$${Number(p.amount).toLocaleString()} - ${p.description}`,
      message: p.client ? `Pago pendiente de ${p.client.name}` : 'Pago pendiente',
      entityType: 'finance',
      entityId: p.id,
      clientName: p.client?.name,
    })
  }

  // 6. Clients at risk
  const riskClients = await prisma.client.findMany({
    where: { organizationId: ctx.org.id, status: 'risk' },
    select: { id: true, name: true },
  })
  for (const c of riskClients) {
    alerts.push({
      id: `risk-${c.id}`,
      type: 'danger',
      category: 'Clientes en riesgo',
      title: c.name,
      message: 'Cliente marcado como en riesgo',
      entityType: 'client',
      entityId: c.id,
      clientName: c.name,
    })
  }

  // 7. Clients scaling
  const scalingClients = await prisma.client.findMany({
    where: { organizationId: ctx.org.id, status: 'scaling' },
    select: { id: true, name: true },
  })
  for (const c of scalingClients) {
    alerts.push({
      id: `scaling-${c.id}`,
      type: 'success',
      category: 'Listos para escalar',
      title: c.name,
      message: 'Cliente listo para escalar inversión',
      entityType: 'client',
      entityId: c.id,
      clientName: c.name,
    })
  }

  // Sort: danger first, then warning, then info, then success
  const typeOrder = { danger: 0, warning: 1, info: 2, success: 3 }
  alerts.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])

  return NextResponse.json({
    data: alerts,
    summary: {
      total: alerts.length,
      danger: alerts.filter(a => a.type === 'danger').length,
      warning: alerts.filter(a => a.type === 'warning').length,
      info: alerts.filter(a => a.type === 'info').length,
      success: alerts.filter(a => a.type === 'success').length,
    },
  })
}
