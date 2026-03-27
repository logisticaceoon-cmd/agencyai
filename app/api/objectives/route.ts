import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { searchParams } = new URL(request.url)
  const quarter = searchParams.get('quarter')
  const year = searchParams.get('year')

  let query = supabase
    .from('objectives')
    .select('*, clients(id, name), key_results(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (quarter) query = query.eq('quarter', quarter)
  if (year) query = query.eq('year', parseInt(year))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId, userId } = auth

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('objectives')
      .insert({
        workspace_id: workspaceId,
        title: body.title,
        description: body.description,
        type: body.type || 'agency',
        client_id: body.client_id || null,
        quarter: body.quarter,
        year: body.year || new Date().getFullYear(),
        status: 'active',
        owner_id: body.owner_id || userId,
      })
      .select('*, clients(id, name), key_results(*)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
