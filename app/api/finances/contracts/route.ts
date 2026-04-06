import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contracts:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/finances/contracts:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        workspace_id: workspaceId,
        code: body.code,
        trafficker_name: body.trafficker_name,
        client_name: body.client_name || null,
        client_id: body.client_id || null,
        service: body.service || null,
        monthly_fee: body.monthly_fee || 0,
        currency: body.currency || 'USD',
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        status: body.status || 'active',
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contract:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/finances/contracts:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
