import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole } from '@/lib/roles'
import { sanitizeError } from '@/lib/sanitize-error'

const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense'], { message: 'El tipo es obligatorio (income o expense)' }),
  amount: z.number({ message: 'El monto es obligatorio' }).positive('El monto debe ser mayor a 0'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  currency: z.string().optional(),
  category: z.string().optional().nullable(),
  date: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'trafficker' || appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para ver finanzas' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: transactions, error }, { data: commClients }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name, pays_percentage, percentage_value')
        .eq('workspace_id', workspaceId)
        .eq('pays_percentage', true),
    ])

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ data: [], commissionClients: [], summary: { totalIncome: 0, totalExpenses: 0 } })
    }

    return NextResponse.json({
      data: transactions || [],
      commissionClients: commClients || [],
      summary: {
        totalIncome: (transactions || []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
        totalExpenses: (transactions || []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      },
    })
  } catch (err) {
    console.error('Error in GET /api/finances:', err)
    return NextResponse.json({ data: [], commissionClients: [], summary: { totalIncome: 0, totalExpenses: 0 } })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'trafficker' || appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para registrar transacciones' }, { status: 403 })
    }

    const body = await request.json()
    const result = createTransactionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const parsed = result.data

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        workspace_id: workspaceId,
        client_id: parsed.clientId || null,
        project_id: parsed.projectId || null,
        type: parsed.type,
        amount: parsed.amount,
        currency: parsed.currency || 'USD',
        category: parsed.category || null,
        description: parsed.description,
        date: parsed.date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'POST /api/finances') }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'trafficker' || appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para editar transacciones' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.amount !== undefined) updates.amount = body.amount
    if (body.description !== undefined) updates.description = body.description
    if (body.date !== undefined) updates.date = body.date
    if (body.category !== undefined) updates.category = body.category || null
    if (body.clientId !== undefined) updates.client_id = body.clientId || null

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'PATCH /api/finances') }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PATCH /api/finances:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const appRole = normalizeRole(role)
    if (appRole === 'trafficker' || appRole === 'viewer') {
      return NextResponse.json({ error: 'Sin permisos para eliminar transacciones' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      return NextResponse.json({ error: sanitizeError(error, 'DELETE /api/finances') }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/finances:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
