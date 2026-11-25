import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

// POST: Actualizar presencia del usuario
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth

    const { supabase, userId, fullName, workspaceId } = auth
    const body = await req.json()
    const { current_page, entity_type, entity_id } = body

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
        { onConflict: 'user_id,workspace_id' }
      )

    // Table may not exist yet — fail silently, presence is non-critical
    if (error && error.code === 'PGRST205') {
      return NextResponse.json({ ok: true, note: 'presence_table_missing' })
    }

    if (error) {
      return NextResponse.json({ ok: true }) // non-critical, never return 500
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // presence is never critical
  }
}

// GET: Obtener usuarios activos
export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth

    const { supabase, workspaceId } = auth
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('user_presence')
      .select('user_id, user_name, current_page, entity_type, entity_id, last_seen')
      .eq('workspace_id', workspaceId)
      .gte('last_seen', fiveMinutesAgo)
      .order('last_seen', { ascending: false })

    if (error) {
      return NextResponse.json({ users: [], count: 0 }) // fail silently
    }

    return NextResponse.json({ users: data || [], count: data?.length || 0 })
  } catch {
    return NextResponse.json({ users: [], count: 0 })
  }
}
