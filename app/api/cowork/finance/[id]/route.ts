import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { transaction: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork finance GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.type !== undefined) updates.type = body.type
    if (body.amount !== undefined) updates.amount = body.amount
    if (body.description !== undefined) updates.description = body.description
    if (body.category !== undefined) updates.category = body.category
    if (body.client_id !== undefined) updates.client_id = body.client_id
    if (body.project_id !== undefined) updates.project_id = body.project_id
    if (body.date !== undefined) updates.date = body.date
    if (body.currency !== undefined) updates.currency = body.currency

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork finance PATCH error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { transaction: data, message: 'Transaction updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork finance PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select('id, description, amount')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { message: `Transaction deleted ($${data.amount})`, id: data.id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork finance DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
