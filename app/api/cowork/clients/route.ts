import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import { FOUNDER_WORKSPACE_IDS, PLAN_MAP } from '@/lib/plans'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, brand, email, phone, status, monthlyFee, currency')
      .eq('workspace_id', organizationId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) {
      console.error('Cowork clients GET error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { clients: data || [], total: data?.length || 0 },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork clients GET error:', err)
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

    // ─── Verificar límite de clientes según el plan ──────────────────────────
    if (!FOUNDER_WORKSPACE_IDS.has(organizationId)) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('plan')
        .eq('id', organizationId)
        .single()

      const plan = ws?.plan || 'free'
      const planDef = PLAN_MAP[plan as keyof typeof PLAN_MAP] ?? PLAN_MAP.free
      const maxClients = planDef.maxClients

      if (maxClients !== Infinity) {
        const { count } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', organizationId)
          .is('deleted_at', null)

        if ((count ?? 0) >= maxClients) {
          return NextResponse.json({
            error: `Client limit reached. Your plan allows a maximum of ${maxClients} clients.`,
            limitReached: true,
            maxClients,
          }, { status: 403 })
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from('clients')
      .insert({
        workspace_id: organizationId,
        name: body.name,
        brand: body.brand || null,
        email: body.email || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        contactPerson: body.contact_person || null,
        country: body.country || null,
        currency: body.currency || 'USD',
        status: body.status || 'active',
        industry: body.industry || null,
        website: body.website || null,
        notes: body.notes || null,
        observations: body.observations || null,
        monthlyFee: body.monthly_fee || null,
        commissionPct: body.commission_pct || null,
        serviceType: body.service_type || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork clients POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { client: data, message: 'Client created successfully from Cowork' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork clients POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
