import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  // Get transactions for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, clients(id, name)')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get commission clients
  const { data: commClients } = await supabase
    .from('clients')
    .select('id, name, pays_percentage, percentage_value')
    .eq('workspace_id', workspaceId)
    .eq('pays_percentage', true)
    .is('deleted_at', null)

  return NextResponse.json({
    data: transactions || [],
    commissionClients: commClients || [],
    summary: {
      totalIncome: (transactions || []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      totalExpenses: (transactions || []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
    },
  })
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        workspace_id: workspaceId,
        client_id: body.clientId || null,
        project_id: body.projectId || null,
        type: body.type,
        amount: body.amount,
        currency: body.currency || 'USD',
        category: body.category || null,
        description: body.description,
        date: body.date || new Date().toISOString().split('T')[0],
      })
      .select('*, clients(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
