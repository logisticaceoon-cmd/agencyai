import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/market-research/portal?token=xxx
// Acceso público — devuelve datos del panel por token (sin autenticación)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    const supabase = createAdminClient()

    // Validar token y obtener cliente
    const { data: tokenRecord, error: tokenErr } = await supabase
      .from('research_tokens')
      .select('*, clients(id, name, industry, country, website)')
      .eq('token', token)
      .single()

    if (tokenErr || !tokenRecord) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    const clientId = tokenRecord.client_id

    // Registrar acceso
    await supabase
      .from('research_tokens')
      .update({ last_viewed: new Date().toISOString() })
      .eq('token', token)

    // Obtener lista de reportes
    const { data: reports } = await supabase
      .from('market_reports')
      .select('id, report_month, status, created_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .order('report_month', { ascending: false })
      .limit(24)

    // Reporte más reciente completo
    const latest = reports?.[0]
    let latestFull = null
    if (latest) {
      const { data } = await supabase
        .from('market_reports')
        .select('*')
        .eq('id', latest.id)
        .single()
      latestFull = data
    }

    return NextResponse.json({
      client: tokenRecord.clients,
      reports: reports || [],
      latest: latestFull,
    })

  } catch (err) {
    console.error('[market-research/portal] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
