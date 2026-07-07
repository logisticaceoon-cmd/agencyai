import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { randomBytes, createHash } from 'crypto'

function generateApiKey(): string {
  return `sk_agencyai_${randomBytes(24).toString('hex')}`
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
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
      .order('createdAt', { ascending: false })

    if (error) {
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch {
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
    const keyHash = hashApiKey(key)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: workspaceId,
        name: body.name.trim(),
        description: body.description || null,
        key: keyHash,
        status: 'active',
      })
      .select('id, name, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al crear API key' }, { status: 500 })
    }

    // Return the plaintext key only once — it won't be retrievable again
    return NextResponse.json({ data: { ...data, key } }, { status: 201 })
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
      return NextResponse.json({ error: 'Error al revocar API key' }, { status: 500 })
    }

    return NextResponse.json({ data: { message: 'API key revocada' } })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
