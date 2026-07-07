import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth
  const { id } = await params

  try {
    // Verify objective belongs to workspace
    const { data: obj } = await supabase
      .from('objectives')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!obj) return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 })

    const body = await request.json()

    const { data, error } = await supabase
      .from('key_results')
      .insert({
        objective_id: id,
        title: body.title,
        description: body.description,
        metric_type: body.metric_type || 'percentage',
        start_value: body.start_value || 0,
        target_value: body.target_value,
        current_value: body.current_value || 0,
        unit: body.unit,
        due_date: body.due_date,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase } = auth

  try {
    const body = await request.json()
    const { kr_id, current_value } = body

    const { data, error } = await supabase
      .from('key_results')
      .update({ current_value })
      .eq('id', kr_id)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
