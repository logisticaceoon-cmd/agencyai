import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // format: YYYY-MM

  let startDate: Date
  let endDate: Date

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split('-').map(Number)
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0, 23, 59, 59, 999)
  } else {
    // Fallback: use legacy month/year params or current month
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0, 23, 59, 59, 999)
  }

  const [tasks, meetings] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: ctx.org.id,
        deadline: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        status: true,
        priority: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { deadline: 'asc' },
    }),
    prisma.meeting.findMany({
      where: {
        organizationId: ctx.org.id,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        date: true,
        attendees: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  return NextResponse.json({ tasks, meetings })
}
