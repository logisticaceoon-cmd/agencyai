import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const type = searchParams.get('type')
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '50'))

    let query = supabase
      .from('client_interactions')
      .select('*, clients(id, name)')
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false })
      .limit(limit)

    if (clientId) query = query.eq('client_id', clientId)
    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching communications:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Communications GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { client_id, type, summary, outcome, next_action, duration_minutes, date } = body

    if (!client_id || !type || !summary) {
      return NextResponse.json({ error: 'client_id, type y summary son requeridos' }, { status: 400 })
    }

    const validTypes = ['email', 'call', 'meeting', 'whatsapp', 'note', 'other']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de interaccion no valido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('client_interactions')
      .insert({
        workspace_id: workspaceId,
        client_id,
        type,
        summary,
        outcome: outcome || null,
        next_action: next_action || null,
        duration_minutes: duration_minutes || null,
        date: date || new Date().toISOString(),
        created_by: userId,
      })
      .select('*, clients(id, name)')
      .single()

    if (error) {
      console.error('Error creating communication:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Communications POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
