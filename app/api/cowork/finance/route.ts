import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // income, expense, all
    const period = searchParams.get('period') // YYYY-MM
    const clientId = searchParams.get('client_id')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '200')

    // Fetch transactions
    let txQuery = supabase
      .from('transactions')
      .select('*')
      .eq('workspace_id', organizationId)
      .order('date', { ascending: false })
      .limit(limit)

    if (type && type !== 'all') txQuery = txQuery.eq('type', type)
    if (clientId) txQuery = txQuery.eq('client_id', clientId)
    if (category) txQuery = txQuery.eq('category', category)
    if (period) {
      const [y, m] = period.split('-').map(Number)
      const start = new Date(y, m - 1, 1).toISOString()
      const end = new Date(y, m, 0, 23, 59, 59).toISOString()
      txQuery = txQuery.gte('date', start).lte('date', end)
    }

    const { data: transactions, error: txErr } = await txQuery

    // Fetch payroll for the period
    let payrollQuery = supabase
      .from('payroll')
      .select('*')
      .eq('workspace_id', organizationId)
      .order('pay_date', { ascending: false })

    if (period) payrollQuery = payrollQuery.eq('period', period)

    const { data: payroll, error: payErr } = await payrollQuery

    if (txErr) {
      console.error('Cowork finance GET tx error:', txErr)
    }
    if (payErr) {
      console.error('Cowork finance GET payroll error:', payErr)
    }

    // Calculate summaries
    const txList = transactions || []
    const income = txList.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = txList.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const totalPayroll = (payroll || []).reduce((s, p) => s + Number(p.net_salary), 0)

    return NextResponse.json({
      success: true,
      data: {
        transactions: txList,
        payroll: payroll || [],
        summary: {
          total_income: income,
          total_expenses: expenses,
          total_payroll: totalPayroll,
          net_profit: income - expenses - totalPayroll,
          transaction_count: txList.length,
          payroll_count: (payroll || []).length,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork finance GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.amount || !body.type) {
      return NextResponse.json({ error: 'amount and type are required' }, { status: 400 })
    }

    if (!['income', 'expense'].includes(body.type)) {
      return NextResponse.json({ error: 'type must be "income" or "expense"' }, { status: 400 })
    }

    const dateObj = body.date ? new Date(body.date) : new Date()

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        workspace_id: organizationId,
        type: body.type,
        amount: body.amount,
        description: body.description || '',
        category: body.category || null,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        date: dateObj.toISOString(),
        currency: body.currency || 'USD',
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork finance POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { transaction: data, message: 'Transaction created successfully' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork finance POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
