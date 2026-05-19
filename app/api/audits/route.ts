import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(200)
      .order('createdAt', { ascending: false })

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
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('audits')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
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
