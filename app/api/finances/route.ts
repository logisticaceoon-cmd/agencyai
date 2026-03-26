import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  clientId: z.string().optional(),
  type: z.enum(['income', 'expense', 'salary', 'commission']),
  category: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  date: z.string(),
  isPaid: z.boolean().default(false),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const type = searchParams.get('type')
  const clientId = searchParams.get('clientId')

  const where: Record<string, unknown> = { organizationId: ctx.org.id, month, year }
  if (type) where.type = type
  if (clientId) where.clientId = clientId

  const finances = await prisma.finance.findMany({
    where,
    include: { client: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  })

  const income = finances.filter(f => f.type === 'income' || f.type === 'commission')
  const expenses = finances.filter(f => f.type === 'expense' || f.type === 'salary')

  const totalIncome = income.reduce((s, f) => s + Number(f.amount), 0)
  const totalExpenses = expenses.reduce((s, f) => s + Number(f.amount), 0)
  const pendingPayments = finances.filter(f => !f.isPaid).reduce((s, f) => s + Number(f.amount), 0)

  return NextResponse.json({
    data: finances,
    summary: {
      totalIncome,
      totalExpenses,
      utility: totalIncome - totalExpenses,
      pendingPayments,
      month,
      year,
    },
  })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  if (ctx.membership.role === 'trafficker') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const dateObj = new Date(data.date)

    const finance = await prisma.finance.create({
      data: {
        organizationId: ctx.org.id,
        clientId: data.clientId || undefined,
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        date: dateObj,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        isPaid: data.isPaid,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      },
      include: { client: { select: { id: true, name: true } } },
    })

    await prisma.activityLog.create({
      data: {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        actionType: 'finance_created',
        entityType: 'finance',
        entityId: finance.id,
        description: `Registro financiero: ${data.description} ($${data.amount})`,
      },
    })

    return NextResponse.json({ data: finance }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
