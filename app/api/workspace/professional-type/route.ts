import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

interface ProfessionalTypeRow {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  terminology: Record<string, string> | null
  default_client_categories: Array<{ name: string; icon: string; color: string }> | null
  suggested_kpis: string[] | null
  ai_agent_context: string | null
}

function buildConfig(row: ProfessionalTypeRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || '⚡',
    color: row.color || '#2563eb',
    terminology: {
      clients: row.terminology?.clients || 'Clientes',
      projects: row.terminology?.projects || 'Proyectos',
      tasks: row.terminology?.tasks || 'Tareas',
      reports: row.terminology?.reports || 'Reportes',
      income: row.terminology?.income || 'Ingresos',
      team: row.terminology?.team || 'Equipo',
    },
    defaultClientCategories: row.default_client_categories || [],
    suggestedKpis: row.suggested_kpis || [],
    aiAgentContext: row.ai_agent_context || '',
  }
}

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('professional_type_id, professional_type_custom')
      .eq('id', workspaceId)
      .maybeSingle()

    const typeId = workspace?.professional_type_id || 'marketing_agency'

    const { data: ptype } = await supabase
      .from('professional_types')
      .select('*')
      .eq('id', typeId)
      .maybeSingle()

    if (!ptype) {
      return NextResponse.json({ config: null, typeId })
    }

    return NextResponse.json({
      config: buildConfig(ptype as ProfessionalTypeRow),
      typeId,
      customName: workspace?.professional_type_custom || null,
    })
  } catch (err) {
    console.error('Error in GET professional-type:', err)
    return NextResponse.json({ config: null })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()
    const { professional_type_id, professional_type_custom } = body

    const { error } = await supabase
      .from('workspaces')
      .update({
        professional_type_id,
        professional_type_custom: professional_type_custom || null,
        onboarding_completed: true,
      })
      .eq('id', workspaceId)

    if (error) {
      console.error('Error updating professional type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch and return new config
    const { data: ptype } = await supabase
      .from('professional_types')
      .select('*')
      .eq('id', professional_type_id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      config: ptype ? buildConfig(ptype as ProfessionalTypeRow) : null,
    })
  } catch (err) {
    console.error('Error in POST professional-type:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Public endpoint to list all types (for selector)
export async function PUT() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase } = auth

    const { data } = await supabase
      .from('professional_types')
      .select('id, name, description, icon, color')
      .order('name')

    return NextResponse.json({ types: data || [] })
  } catch (err) {
    console.error('Error listing professional types:', err)
    return NextResponse.json({ types: [] })
  }
}
