import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data } = await supabase
      .from('workspace_ai_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    return NextResponse.json({ data: data || null })
  } catch (err) {
    console.error('Error fetching AI config:', err)
    return NextResponse.json({ data: null })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    const updateData: Record<string, unknown> = {
      workspace_id: workspaceId,
      updated_at: new Date().toISOString(),
    }

    if (body.agent_name !== undefined) updateData.agent_name = body.agent_name
    if (body.agent_avatar !== undefined) updateData.agent_avatar = body.agent_avatar
    if (body.agent_personality !== undefined) updateData.agent_personality = body.agent_personality
    if (body.ai_provider !== undefined) updateData.ai_provider = body.ai_provider
    if (body.anthropic_api_key !== undefined) updateData.anthropic_api_key = body.anthropic_api_key
    if (body.openai_api_key !== undefined) updateData.openai_api_key = body.openai_api_key
    if (body.language !== undefined) updateData.language = body.language

    const { data, error } = await supabase
      .from('workspace_ai_config')
      .upsert(updateData, { onConflict: 'workspace_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error saving AI config:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
