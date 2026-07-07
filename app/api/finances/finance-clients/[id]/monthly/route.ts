import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id: clientId } = await params
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Verify client belongs to workspace
    const { data: client, error: clientError } = await supabase
      .from('finance_clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (clientError) {
      console.error(clientError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    let query = supabase
      .from('finance_client_monthly')
      .select('*')
      .eq('client_id', clientId)

    if (month) query = query.eq('month', parseInt(month, 10))
    if (year) query = query.eq('year', parseInt(year, 10))

    const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

async function upsertMonthly(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { id: clientId } = await params
  const body = await request.json()
  const { month, year, billed_amount, commission_amount, currency, status, notes } = body

  // Verify client belongs to workspace
  const { data: client, error: clientError } = await supabase
    .from('finance_clients')
    .select('id')
    .eq('id', clientId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (clientError) {
    console.error(clientError)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const { data: existing, error: existingError } = await supabase
    .from('finance_client_monthly')
    .select('id')
    .eq('client_id', clientId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (existingError) {
    console.error(existingError)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  const payload: any = {
    client_id: clientId,
    month,
    year,
    billed_amount,
    commission_amount,
    currency,
    status,
    notes,
  }
  if (status === 'paid') {
    payload.closed_at = new Date().toISOString()
  }

  let data: any
  let error: any
  if (existing) {
    const res = await supabase
      .from('finance_client_monthly')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    data = res.data
    error = res.error
  } else {
    const res = await supabase
      .from('finance_client_monthly')
      .insert(payload)
      .select()
      .single()
    data = res.data
    error = res.error
  }

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    return await upsertMonthly(request, ctx)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    return await upsertMonthly(request, ctx)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
