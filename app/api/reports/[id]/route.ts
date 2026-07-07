import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: report })
  } catch (err) {
    console.error('Error in GET /api/reports/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const body = await request.json()

    // Whitelist allowed fields to prevent workspace_id or other sensitive field overrides
    const allowed: Record<string, unknown> = {}
    const safeFields = ['title', 'description', 'reportType', 'status', 'investment', 'sales', 'roas', 'previousSales', 'growthPct', 'tasksCompleted', 'tasksPending', 'nextMonthPlan', 'sentToClient', 'sentAt', 'clientId', 'taskId', 'priority', 'tags', 'fileUrls']
    for (const key of safeFields) {
      if (body[key] !== undefined) allowed[key] = body[key]
    }

    const { data, error } = await supabase
      .from('reports')
      .update(allowed)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PUT /api/reports/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/reports/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
