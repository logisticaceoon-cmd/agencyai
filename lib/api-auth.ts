import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface ApiAuthContext {
  supabase: ReturnType<typeof createAdminClient>
  organizationId: string
  keyName: string
}

/**
 * Validate an API key from the Authorization header.
 * Returns an ApiAuthContext on success or a NextResponse error.
 */
export async function validateApiKey(
  request: Request
): Promise<ApiAuthContext | NextResponse> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
      { status: 401 }
    )
  }

  const apiKey = authHeader.slice(7)
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is empty' },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, organization_id, name')
    .eq('key', apiKey)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Invalid or revoked API key' },
      { status: 401 }
    )
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then()

  return {
    supabase,
    organizationId: data.organization_id,
    keyName: data.name,
  }
}

export function isApiAuthError(
  result: ApiAuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
