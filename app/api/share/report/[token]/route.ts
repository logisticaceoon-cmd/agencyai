import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, title, description, report_type, status, content, created_at, workspace_id')
      .eq('share_token', token)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado o enlace invalido' }, { status: 404 })
    }

    // Obtener nombre del workspace para mostrar en el reporte
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', report.workspace_id)
      .single()

    return NextResponse.json({
      title: report.title,
      description: report.description,
      type: report.report_type,
      status: report.status,
      content: report.content,
      created_at: report.created_at,
      organization: org?.name || 'AgencyAI',
    })
  } catch (err) {
    console.error('Share report GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
