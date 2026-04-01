import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('workspace_ai_config')
    .select('*')
    .eq('workspace_id', ctx.org.id)
    .single()

  return NextResponse.json({ data: data || null })
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const body = await request.json()
  const supabase = await createServerSupabaseClient()

  const updateData: Record<string, unknown> = {
    workspace_id: ctx.org.id,
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
}
