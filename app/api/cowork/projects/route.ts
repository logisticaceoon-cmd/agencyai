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
      return NextResponse.json({ error: `Error fetching projects: ${error.message}` }, { status: 500 })
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
