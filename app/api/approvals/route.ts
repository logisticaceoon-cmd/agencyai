import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')

    let query = supabase
      .from('approval_requests')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Error al obtener aprobaciones' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { title, description, client_id, task_id, doc_id, attachments, expires_at } = body

    if (!title) {
      return NextResponse.json({ error: 'El titulo es obligatorio' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('approval_requests')
      .insert({
        workspace_id: workspaceId,
        title,
        description: description || null,
        client_id: client_id || null,
        task_id: task_id || null,
        doc_id: doc_id || null,
        attachments: attachments || [],
        expires_at: expires_at || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
