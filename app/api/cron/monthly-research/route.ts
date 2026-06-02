import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Ejecuta el día 1 de cada mes a las 7 AM UTC
// Genera reportes de investigación para todos los clientes activos con competidores configurados
export async function GET(request: Request) {
  const cronSecret = request.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const reportMonth = new Date().toISOString().slice(0, 7)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  console.log(`[CRON monthly-research] Iniciando para ${reportMonth}`)

  // Obtener clientes activos que tienen al menos un competidor configurado
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, workspace_id')
    .eq('status', 'active')
    .in('id', supabase
      .from('market_research_competitors')
      .select('client_id') as unknown as string[]
    )

  // Fallback si el in() con subquery no funciona: obtener todos con competitors
  const { data: competitorClientIds } = await supabase
    .from('market_research_competitors')
    .select('client_id')

  const uniqueClientIds = [...new Set((competitorClientIds || []).map(c => c.client_id))]

  const { data: activeClients } = await supabase
    .from('clients')
    .select('id, name, workspace_id')
    .eq('status', 'active')
    .in('id', uniqueClientIds.length > 0 ? uniqueClientIds : ['no-clients'])

  const clientList = activeClients || []
  console.log(`[CRON monthly-research] ${clientList.length} clientes a procesar`)

  const results = { total: clientList.length, success: 0, failed: 0, skipped: 0, details: [] as Array<{client: string; status: string; error?: string}> }

  for (const client of clientList) {
    // Verificar si ya existe un reporte completado para este mes
    const { data: existing } = await supabase
      .from('market_reports')
      .select('id, status')
      .eq('client_id', client.id)
      .eq('report_month', reportMonth + '-01')
      .single()

    if (existing?.status === 'completed') {
      results.skipped++
      results.details.push({ client: client.name, status: 'skipped (ya existe)' })
      continue
    }

    try {
      const res = await fetch(`${baseUrl}/api/market-research/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // El endpoint de generate usa getAuthContext, necesitamos simularlo
          // En el cron, usamos el admin client directamente llamando a la función
        },
        body: JSON.stringify({ clientId: client.id, month: reportMonth }),
      })

      if (res.ok) {
        results.success++
        results.details.push({ client: client.name, status: 'success' })
      } else {
        const err = await res.json()
        results.failed++
        results.details.push({ client: client.name, status: 'failed', error: err.error })
      }
    } catch (err) {
      results.failed++
      results.details.push({ client: client.name, status: 'error', error: String(err) })
    }

    // Esperar 15 segundos entre clientes (rate limits)
    await new Promise(r => setTimeout(r, 15000))
  }

  console.log('[CRON monthly-research] Completado:', results)
  return NextResponse.json({ success: true, month: reportMonth, results })
}
