import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// GET /api/market-research/token?clientId=xxx
// Devuelve o crea el token compartible para el panel del cliente
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 })

    // Verificar cliente
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .single()
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Buscar token existente
    const { data: existing } = await supabase
      .from('research_tokens')
      .select('token')
      .eq('client_id', clientId)
      .single()

    if (existing) return NextResponse.json({ token: existing.token })

    // Crear nuevo token
    const { data: created, error } = await supabase
      .from('research_tokens')
      .insert({ client_id: clientId, workspace_id: workspaceId })
      .select('token')
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
    return NextResponse.json({ token: created.token })

  } catch (err) {
    console.error('[market-research/token] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
