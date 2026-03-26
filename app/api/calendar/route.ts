import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const [tasks, meetings, finances] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: ctx.org.id,
        deadline: { gte: startDate, lte: endDate },
      },
      select: {
        id: true, title: true, deadline: true, status: true, priority: true,
        client: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
    }),
    prisma.meeting.findMany({
      where: {
        organizationId: ctx.org.id,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true, title: true, date: true,
        client: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.finance.findMany({
      where: {
        organizationId: ctx.org.id,
        month, year,
        isPaid: false,
      },
      select: {
        id: true, description: true, date: true, amount: true, type: true,
        client: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  const events = [
    ...tasks.map(t => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      date: t.deadline,
      status: t.status,
      priority: t.priority,
      client: t.client?.name,
    })),
    ...meetings.map(m => ({
      id: m.id,
      type: 'meeting' as const,
      title: m.title,
      date: m.date,
      client: m.client?.name,
    })),
    ...finances.map(f => ({
      id: f.id,
      type: 'payment' as const,
      title: f.description,
      date: f.date,
      amount: Number(f.amount),
      client: f.client?.name,
    })),
  ].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  return NextResponse.json({ data: events, month, year })
}
