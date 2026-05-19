import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const tokenHash = request.nextUrl.searchParams.get('token_hash')

  // Minimal test — does basic routing work?
  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/sign-in?error=no_token`)
  }

  return NextResponse.redirect(`${origin}/sign-in?error=test_ok&token=${tokenHash.substring(0, 8)}`)
}
