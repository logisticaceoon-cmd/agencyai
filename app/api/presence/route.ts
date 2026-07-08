import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// POST: Actualizar presencia del usuario
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  const { supabase, userId, fullName, workspaceId } = auth

  try {
    const body = await req.json()
    const { current_page, entity_type, entity_id } = body

    // Upsert en la tabla user_presence
    const { error } = await supabase
      .from('user_presence')
      .upsert(
        {
          user_id: userId,
          workspace_id: workspaceId,
          user_name: fullName,
          current_page: current_page || '/',
          entity_type: entity_type || null,
          entity_id: entity_id || null,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,workspace_id',
        }
      )

    if (error) {
      console.error('Error al actualizar presencia:', error)
      return NextResponse.json({ error: 'Error al actualizar presencia' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error en POST /api/presence:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET: Obtener usuarios activos (vistos en los ultimos 5 minutos)
export async function GET() {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  const { supabase, workspaceId } = auth

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('user_presence')
      .select('user_id, user_name, current_page, entity_type, entity_id, last_seen')
      .eq('workspace_id', workspaceId)
      .gte('last_seen', fiveMinutesAgo)
      .order('last_seen', { ascending: false })

    if (error) {
      console.error('Error al obtener presencia:', error)
      return NextResponse.json({ error: 'Error al obtener presencia' }, { status: 500 })
    }

    return NextResponse.json({
      users: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('Error en GET /api/presence:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
