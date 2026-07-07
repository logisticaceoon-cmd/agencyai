import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

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

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()
    const { name, description, color, icon, position } = body

    const { data: existing } = await supabase
      .from('service_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('name', name)
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing })

    const { data, error } = await supabase
      .from('service_categories')
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        color,
        icon,
        position,
      })
      .select()
      .single()

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
