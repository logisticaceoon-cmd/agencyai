import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return `sk_agencyai_${result}`
}

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, description, status, last_used_at, created_at')
      .eq('organization_id', workspaceId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/cowork/api-keys:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const key = generateApiKey()

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: workspaceId,
        name: body.name.trim(),
        description: body.description || null,
        key,
        status: 'active',
      })
      .select('id, name, key, created_at')
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/cowork/api-keys:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 })
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', id)
      .eq('organization_id', workspaceId)

    if (error) {
      console.error('Error revoking API key:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { message: 'API key revocada' } })
  } catch (err) {
    console.error('Error in DELETE /api/cowork/api-keys:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
