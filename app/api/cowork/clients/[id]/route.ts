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
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { client: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork client GET error:', err)
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
    if (body.name !== undefined) updates.name = body.name
    if (body.brand !== undefined) updates.brand = body.brand
    if (body.email !== undefined) updates.email = body.email
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp
    if (body.contact_person !== undefined) updates.contactPerson = body.contact_person
    if (body.country !== undefined) updates.country = body.country
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.status !== undefined) updates.status = body.status
    if (body.industry !== undefined) updates.industry = body.industry
    if (body.website !== undefined) updates.website = body.website
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.observations !== undefined) updates.observations = body.observations
    if (body.monthly_fee !== undefined) updates.monthlyFee = body.monthly_fee
    if (body.commission_pct !== undefined) updates.commissionPct = body.commission_pct
    if (body.service_type !== undefined) updates.serviceType = body.service_type
    if (body.payment_status !== undefined) updates.paymentStatus = body.payment_status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork client PATCH error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { client: data, message: 'Client updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork client PATCH error:', err)
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

    // Soft delete (set deleted_at)
    const { data, error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .is('deleted_at', null)
      .select('id, name')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { message: `Client "${data.name}" soft-deleted successfully`, id: data.id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork client DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
