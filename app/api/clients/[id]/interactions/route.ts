import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: clientId } = await params

    const { data, error } = await supabase
      .from('client_interactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: 'Error al cargar interacciones' }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth
    const { id: clientId } = await params
    const body = await request.json()

    if (!body.summary?.trim()) {
      return NextResponse.json({ error: 'El resumen es obligatorio' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('client_interactions')
      .insert({
        workspace_id: workspaceId,
        client_id: clientId,
        type: body.type || 'note',
        date: body.date || new Date().toISOString(),
        duration_minutes: body.duration_minutes || null,
        summary: body.summary.trim(),
        outcome: body.outcome || null,
        next_action: body.next_action || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al crear interaccion' }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
