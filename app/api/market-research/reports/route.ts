import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const reportId = searchParams.get('reportId')

    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 })

    // Reporte específico por ID
    if (reportId) {
      const { data, error } = await supabase
        .from('market_reports')
        .select('*')
        .eq('id', reportId)
        .eq('client_id', clientId)
        .eq('workspace_id', workspaceId)
        .single()
      if (error) {
        console.error(error)
        return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ data })
    }

    // Lista de reportes para el cliente
    const { data, error } = await supabase
      .from('market_reports')
      .select('id, report_month, status, created_at, generation_secs, tokens_used, model_used')
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId)
      .order('report_month', { ascending: false })
      .limit(24)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Reporte más reciente completo
    const latest = data?.find(r => r.status === 'completed')
    let latestData = null
    if (latest) {
      const { data: full } = await supabase
        .from('market_reports')
        .select('*')
        .eq('id', latest.id)
        .single()
      latestData = full
    }

    return NextResponse.json({ data: { reports: data || [], latest: latestData } })

  } catch (err) {
    console.error('[market-research/reports] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
