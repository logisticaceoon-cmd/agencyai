import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*, clients(id, name), projects(id, name)')
      .eq('workspace_id', ctx.org.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback without joins
      const { data: fallback } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('workspace_id', ctx.org.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      return NextResponse.json({ data: fallback || [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        workspace_id: ctx.org.id,
        title: body.title,
        url: body.url,
        description: body.description || null,
        icon: body.icon || '📄',
        color: body.color || '#2563eb',
        category: body.category || 'general',
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        pinned: body.pinned || false,
        created_by: ctx.membership.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 })
  }
}
