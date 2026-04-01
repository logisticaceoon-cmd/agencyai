import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('workspace_id', ctx.org.id)
      .order('created_at', { ascending: false })

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
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('recordings')
      .insert({
        workspace_id: ctx.org.id,
        created_by: ctx.user.id,
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error creating recording:', err)
    return NextResponse.json({ error: 'Error creating recording' }, { status: 400 })
  }
}
