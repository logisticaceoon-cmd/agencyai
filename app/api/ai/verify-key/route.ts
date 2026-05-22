import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth

    const { provider, key } = await request.json()

    if (!key || key.length < 10) {
      return NextResponse.json({ valid: false, error: 'Key inválida o vacía' }, { status: 400 })
    }

    if (provider === 'anthropic') {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        })
        // 200 = valid, 429 = rate limited but valid, 401 = invalid
        if (res.ok || res.status === 429) {
          return NextResponse.json({ valid: true })
        }
        const err = await res.json().catch(() => ({}))
        return NextResponse.json({ valid: false, error: err?.error?.message || `HTTP ${res.status}` })
      } catch (e) {
        return NextResponse.json({ valid: false, error: 'No se pudo conectar con Anthropic' }, { status: 502 })
      }
    }

    if (provider === 'openai') {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        if (res.ok) {
          return NextResponse.json({ valid: true })
        }
        const err = await res.json().catch(() => ({}))
        return NextResponse.json({ valid: false, error: err?.error?.message || `HTTP ${res.status}` })
      } catch (e) {
        return NextResponse.json({ valid: false, error: 'No se pudo conectar con OpenAI' }, { status: 502 })
      }
    }

    return NextResponse.json({ valid: false, error: 'Proveedor inválido' }, { status: 400 })
  } catch (err) {
    console.error('Error en verify-key:', err)
    return NextResponse.json({ valid: false, error: 'Error interno' }, { status: 500 })
  }
}
