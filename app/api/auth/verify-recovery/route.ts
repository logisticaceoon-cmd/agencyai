import { NextResponse } from 'next/server'

/**
 * GET /api/auth/verify-recovery?token_hash=...&type=recovery
 *
 * Verifies the password recovery OTP directly via Supabase REST API.
 * On success: redirects to /reset-password with access_token in the URL hash
 *             so the browser-side Supabase client picks it up automatically.
 * On failure: redirects to /sign-in?error=link_expired
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (!tokenHash || type !== 'recovery') {
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[verify-recovery] Missing Supabase env vars')
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }

  try {
    // Call Supabase REST API directly to verify the OTP
    const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ token_hash: tokenHash, type: 'recovery' }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[verify-recovery] Supabase verify error:', res.status, errBody)
      return NextResponse.redirect(`${origin}/sign-in?error=link_expired`)
    }

    const data = await res.json() as { access_token?: string; refresh_token?: string }

    if (!data.access_token) {
      console.error('[verify-recovery] No access_token in response')
      return NextResponse.redirect(`${origin}/sign-in?error=link_expired`)
    }

    // Redirect to reset-password with the token in the hash fragment.
    // Supabase's createBrowserClient detects #access_token=...&type=recovery
    // and fires the PASSWORD_RECOVERY event automatically.
    const resetUrl =
      `${origin}/reset-password` +
      `#access_token=${data.access_token}` +
      `&refresh_token=${data.refresh_token ?? ''}` +
      `&type=recovery`

    return NextResponse.redirect(resetUrl)

  } catch (err) {
    console.error('[verify-recovery] Unexpected error:', err)
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }
}
