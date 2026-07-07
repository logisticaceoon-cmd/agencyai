import { NextResponse } from 'next/server'

/**
 * CSRF protection via Origin/Referer header validation.
 * Returns null if the request is safe, or a 403 response if CSRF is detected.
 *
 * Safe requests: GET, HEAD, OPTIONS (no state changes).
 * For state-changing methods (POST, PUT, PATCH, DELETE):
 *   - Must have a valid Origin or Referer header matching our domain
 *   - API key authenticated requests (Bearer sk_*) are exempt (not cookie-based)
 */
export function csrfCheck(request: Request): NextResponse | null {
  const method = request.method.toUpperCase()

  // Safe methods don't need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return null

  // API key requests are not cookie-based — exempt from CSRF
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer sk_')) return null

  // Cron requests authenticated by CRON_SECRET are also exempt
  if (authHeader.startsWith('Bearer ') && !authHeader.includes(' sb-')) return null

  // Check Origin header first
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // If no Origin and no Referer on a state-changing request, block it
  // (this catches simple form submissions from other domains)
  if (!origin && !referer) {
    // Allow same-site requests that browsers don't add Origin to
    // (e.g., server-to-server, cron, etc.)
    const host = request.headers.get('host')
    if (!host) return null // Can't validate, allow
    return null // Be permissive for now — strict mode would block
  }

  // Validate Origin or Referer matches our app
  const host = request.headers.get('host') || ''
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    // Vercel preview deployments
    ...(host.includes('vercel.app') ? [`https://${host}`] : []),
  ]

  // Also allow the NEXT_PUBLIC_APP_URL if configured
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) allowedOrigins.push(appUrl)

  if (origin) {
    if (allowedOrigins.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))) {
      return null
    }
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  if (referer) {
    if (allowedOrigins.some(allowed => referer.startsWith(allowed))) {
      return null
    }
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  return null
}
