import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const origin = request.nextUrl.origin

  if (!tokenHash || type !== 'recovery') {
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ token_hash: tokenHash, type: 'recovery' }),
    })

    if (!res.ok) {
      return NextResponse.redirect(`${origin}/sign-in?error=link_expired`)
    }

    const json = await res.json()
    const accessToken = (json as Record<string, string>).access_token
    const refreshToken = (json as Record<string, string>).refresh_token ?? ''

    if (!accessToken) {
      return NextResponse.redirect(`${origin}/sign-in?error=link_expired`)
    }

    // Pass tokens in hash — Supabase browser client picks them up automatically
    return NextResponse.redirect(
      `${origin}/reset-password#access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`
    )
  } catch {
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }
}
