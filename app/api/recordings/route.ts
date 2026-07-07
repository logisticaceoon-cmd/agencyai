import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching recordings:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error fetching recordings:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('recordings')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        title: body.title,
        platform: body.platform || null,
        url: body.url || null,
        client_id: body.client_id || null,
        duration: body.duration || null,
        participants: body.participants || null,
        notes: body.notes || null,
        recorded_at: body.recorded_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating recording:', error)
      return NextResponse.json({ error: 'Error en la solicitud' }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error creating recording:', err)
    return NextResponse.json({ error: 'Error creating recording' }, { status: 400 })
  }
}
