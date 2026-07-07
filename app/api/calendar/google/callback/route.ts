import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createHmac, timingSafeEqual } from 'crypto'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateB64 = url.searchParams.get('state')

  if (!code || !stateB64) {
    return NextResponse.redirect(new URL('/calendar?error=missing_code', request.url))
  }

  let state: { workspaceId: string; userId: string }
  try {
    const stateObj = JSON.parse(Buffer.from(stateB64, 'base64url').toString())
    const hmacSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const expectedSig = createHmac('sha256', hmacSecret).update(stateObj.data).digest('hex')
    if (!timingSafeEqual(Buffer.from(stateObj.sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return NextResponse.redirect(new URL('/calendar?error=invalid_state', request.url))
    }
    state = JSON.parse(stateObj.data)
  } catch {
    return NextResponse.redirect(new URL('/calendar?error=invalid_state', request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/calendar?error=not_configured', request.url))
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/calendar?error=token_exchange', request.url))
    }

    const tokens = await tokenRes.json()

    const supabase = await createServerSupabaseClient()

    // Upsert token
    await supabase
      .from('google_calendar_tokens')
      .upsert(
        {
          workspace_id: state.workspaceId,
          user_id: state.userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expiry_date: tokens.expires_in
            ? Date.now() + tokens.expires_in * 1000
            : null,
        },
        { onConflict: 'workspace_id,user_id' }
      )

    return NextResponse.redirect(new URL('/calendar?gcal=connected', request.url))
  } catch {
    return NextResponse.redirect(new URL('/calendar?error=unknown', request.url))
  }
}
