import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data } = await supabase
      .from('workspace_ai_config')
      .select('workspace_id, agent_name, agent_avatar, agent_personality, ai_provider, language, updated_at')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    // Never expose API keys in GET - only return non-sensitive config
    const safeData = data ? {
      ...data,
      has_anthropic_key: false,
      has_openai_key: false,
    } : null

    // Check if keys exist (without returning them)
    if (data) {
      const { data: keyCheck } = await supabase
        .from('workspace_ai_config')
        .select('anthropic_api_key, openai_api_key')
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (safeData && keyCheck) {
        safeData.has_anthropic_key = !!keyCheck.anthropic_api_key
        safeData.has_openai_key = !!keyCheck.openai_api_key
      }
    }

    return NextResponse.json({ data: safeData })
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
