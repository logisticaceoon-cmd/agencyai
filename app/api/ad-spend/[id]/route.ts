import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const body = await request.json()

    const allowedFields = [
      'client_id', 'platform', 'campaign_name', 'amount', 'currency',
      'period_start', 'period_end', 'roas', 'impressions', 'clicks',
      'conversions', 'cpa', 'ctr', 'notes',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ad_spend_records')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, clients(id, name)')
      .single()

    if (error) {
      console.error('Error updating ad spend:', error)
      return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in PATCH /api/ad-spend/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase
      .from('ad_spend_records')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Error deleting ad spend:', error)
      return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/ad-spend/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
