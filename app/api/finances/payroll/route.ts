import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { sanitizeError } from '@/lib/sanitize-error'

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Recalculate net_salary if salary fields changed
    if (updates.base_salary !== undefined || updates.bonus !== undefined || updates.deductions !== undefined) {
      const { data: current } = await supabase
        .from('payroll')
        .select('base_salary, bonus, deductions')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()

      if (current) {
        const base = updates.base_salary ?? current.base_salary
        const bonus = updates.bonus ?? current.bonus
        const deductions = updates.deductions ?? current.deductions
        updates.net_salary = Number(base) + Number(bonus) - Number(deductions)
      }
    }

    const { data, error } = await supabase
      .from('payroll')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'PATCH /api/finances/payroll') }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PATCH /api/finances/payroll:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const employeeName = searchParams.get('employee_name')
    const fromPeriod = searchParams.get('from_period')

    if (id) {
      // Delete single entry
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) {
        return NextResponse.json({ error: sanitizeError(error, 'DELETE /api/finances/payroll') }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (employeeName && fromPeriod) {
      // Delete employee from this period forward (keep past records)
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('employee_name', employeeName)
        .gte('period', fromPeriod)

      if (error) {
        return NextResponse.json({ error: sanitizeError(error, 'DELETE /api/finances/payroll') }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Parametros insuficientes' }, { status: 400 })
  } catch (err) {
    console.error('Error in DELETE /api/finances/payroll:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: sanitizeError(error, 'POST /api/finances/payroll') }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances/payroll:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
