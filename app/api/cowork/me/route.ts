import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId, keyName } = auth

    // Get workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, plan, currency, timezone, agency_type, professional_type_id')
      .eq('id', organizationId)
      .single()

    // Get workspace members to find the owner user info
    const { data: members } = await supabase
      .from('workspace_members')
      .select('id, user_id, role, email, name, status')
      .eq('workspace_id', organizationId)
      .eq('status', 'active')

    // Find the owner
    const owner = members?.find(m => m.role === 'owner') || members?.[0] || null

    return NextResponse.json({
      success: true,
      data: {
        api_key_name: keyName,
        workspace: workspace ? {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          owner_id: workspace.owner_id,
          plan: workspace.plan,
          currency: workspace.currency,
          timezone: workspace.timezone,
          agency_type: workspace.agency_type,
          professional_type_id: workspace.professional_type_id,
        } : null,
        owner: owner ? {
          user_id: owner.user_id,
          email: owner.email,
          name: owner.name,
          role: owner.role,
        } : null,
        members: (members || []).map(m => ({
          user_id: m.user_id,
          email: m.email,
          name: m.name,
          role: m.role,
        })),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork me GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
