import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    let query = supabase
      .from('payroll')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('pay_date', { ascending: false })

    if (period) {
      query = query.eq('period', period)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching payroll:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/finances/payroll:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()
    const netSalary = (body.base_salary || 0) + (body.bonus || 0) - (body.deductions || 0)

    const { data, error } = await supabase
      .from('payroll')
      .insert({
        workspace_id: workspaceId,
        employee_name: body.employee_name,
        role: body.role || null,
        base_salary: body.base_salary || 0,
        bonus: body.bonus || 0,
        deductions: body.deductions || 0,
        net_salary: netSalary,
        currency: body.currency || 'USD',
        period: body.period || null,
        pay_date: body.pay_date || null,
        status: body.status || 'pending',
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payroll:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances/payroll:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
