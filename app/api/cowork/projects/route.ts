import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, clientId, status, serviceType, description, startDate, endDate')
      .eq('workspace_id', organizationId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Cowork projects GET error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { projects: data || [], total: data?.length || 0 },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork projects GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: organizationId,
        name: body.name,
        description: body.description || null,
        clientId: body.client_id || null,
        managerId: body.manager_id || null,
        serviceType: body.service_type || null,
        status: body.status || 'active',
        startDate: body.start_date || null,
        endDate: body.end_date || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork projects POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { project: data, message: 'Project created successfully from Cowork' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork projects POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
