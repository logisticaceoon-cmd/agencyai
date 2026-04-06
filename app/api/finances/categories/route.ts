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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
