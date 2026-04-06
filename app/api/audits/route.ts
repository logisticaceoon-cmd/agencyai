import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if ('error' in ctx) return ctx.error

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .eq('workspace_id', ctx.org.id)
      .limit(200)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching audits:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error fetching audits:', err)
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
      .from('audits')
      .insert({
        workspace_id: ctx.org.id,
        created_by: ctx.user.id,
        title: body.title,
        type: body.type || 'proceso',
        severity: body.severity || 'medio',
        audited: body.audited,
        description: body.description || null,
        findings: body.findings || [],
        action_plan: body.action_plan || null,
        deadline: body.deadline || null,
        status: 'abierta',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating audit:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error creating audit:', err)
    return NextResponse.json({ error: 'Error creating audit' }, { status: 400 })
  }
}
