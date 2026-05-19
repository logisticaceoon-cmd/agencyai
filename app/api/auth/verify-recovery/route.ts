import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/auth/verify-recovery?token_hash=...&type=recovery
 *
 * Server-side OTP verification for password recovery.
 * Uses the server Supabase client (cookie-based session).
 * On success: redirects to /reset-password (session already in cookies).
 * On failure: redirects to /sign-in?error=link_expired
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    // Validate required params
    if (!tokenHash || type !== 'recovery') {
      return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
    }

    // Verify OTP using server-side client (sets session cookie automatically)
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })

    if (error) {
      console.error('[verify-recovery] verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}/sign-in?error=link_expired`)
    }

    // Session established in cookies — send to reset password page
    return NextResponse.redirect(`${origin}/reset-password`)

  } catch (err) {
    console.error('[verify-recovery] Unexpected error:', err)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }
}
