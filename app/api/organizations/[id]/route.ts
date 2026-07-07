import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { id } = await params
    if (workspaceId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, role } = auth

    const { id } = await params
    if (workspaceId !== id || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.website !== undefined) updateData.website = body.website
    if (body.timezone !== undefined) updateData.timezone = body.timezone
    if (body.agency_type !== undefined) updateData.agency_type = body.agency_type
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error en la solicitud' }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
