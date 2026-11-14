import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // yyyy-MM

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('content_items')
      .select('id, title, platform, post_type, scheduled_date, status, description')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: true })

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const startDate = `${year}-${String(mon).padStart(2, '0')}-01`
      const endDay = new Date(year, mon, 0).getDate()
      const endDate = `${year}-${String(mon).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      query = query.gte('scheduled_date', startDate).lte('scheduled_date', endDate)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('GET /api/content error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()
    const { title, platform, post_type, scheduled_date, status, description } = body

    if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

    const { data, error } = await supabase
      .from('content_items')
      .insert({
        workspace_id: workspaceId,
        title: title.trim(),
        platform: platform || 'instagram',
        post_type: post_type || 'imagen',
        scheduled_date: scheduled_date || null,
        status: status || 'borrador',
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/content error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
