import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { normalizeRole, getDataScope } from '@/lib/roles'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter')
    const year = searchParams.get('year')

    const appRole = normalizeRole(role)
    const scope = getDataScope('objectives', appRole)

    let query = supabase
      .from('objectives')
      .select('*, key_results(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (quarter) query = query.eq('quarter', quarter)
    if (year) query = query.eq('year', parseInt(year))

    // Trafficker/viewer: solo ven sus propios objetivos
    if (scope === 'assigned') {
      query = query.eq('owner_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching objectives:', error)
      return NextResponse.json({ data: [] })
    }

    const objectivesWithKRs = (data || []).map((obj: Record<string, unknown>) => ({
      ...obj,
      key_results: (obj.key_results as unknown[]) || [],
      clients: null,
    }))

    return NextResponse.json({ data: objectivesWithKRs })
  } catch (err) {
    console.error('Error in GET /api/objectives:', err)
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
      .from('objectives')
      .insert({
        workspace_id: workspaceId,
        title: body.title || body.name,
        description: body.description || null,
        type: body.type || 'agency',
        client_id: body.client_id || null,
        quarter: body.quarter,
        year: body.year || new Date().getFullYear(),
        status: 'active',
        owner_id: body.owner_id || userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating objective:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/objectives:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
