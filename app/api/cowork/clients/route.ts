import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

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
      return NextResponse.json({ error: `Error fetching clients: ${error.message}` }, { status: 500 })
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
