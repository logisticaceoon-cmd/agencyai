import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/verify-recovery?token_hash=...&type=recovery
 *
 * Server-side token verification for password recovery.
 * Verifies the OTP, sets the session cookie, then redirects to /reset-password.
 * This avoids client-side race conditions with createBrowserClient intercepting
 * the token_hash URL parameter before the page useEffect can process it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Validate params
  if (!tokenHash || type !== 'recovery') {
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }

  // Verify OTP server-side and set session cookie
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Cookies can only be set in Server Actions / Route Handlers — this is fine
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  })

  if (error) {
    console.error('verifyOtp error:', error.message)
    // Token expired or already used — redirect to sign-in with error param
    return NextResponse.redirect(
      `${origin}/sign-in?error=link_expired`
    )
  }

  // Session established in cookies — redirect to the password reset page
  return NextResponse.redirect(`${origin}/reset-password`)
}
