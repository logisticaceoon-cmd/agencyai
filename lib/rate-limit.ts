import { NextResponse } from 'next/server'

export type RateLimitTier = 'auth' | 'ai' | 'upload' | 'api'

const TIER_LIMITS: Record<RateLimitTier, { requests: number; window: string }> = {
  auth: { requests: 10, window: '60 s' },
  ai: { requests: 20, window: '60 s' },
  upload: { requests: 30, window: '60 s' },
  api: { requests: 100, window: '60 s' },
}

// Lazy-initialized rate limiters (avoids import errors during build)
let _limiters: Record<RateLimitTier, { limit: (id: string) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }> }> | null = null
let _initialized = false

async function getLimiter(tier: RateLimitTier) {
  if (!process.env.REDIS_URL) return null
  if (_initialized) return _limiters?.[tier] ?? null

  try {
    const { Redis } = await import('@upstash/redis')
    const { Ratelimit } = await import('@upstash/ratelimit')

    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN || '',
    })

    _limiters = {} as typeof _limiters
    for (const [key, config] of Object.entries(TIER_LIMITS)) {
      _limiters![key as RateLimitTier] = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
        prefix: `rl:${key}`,
      })
    }
  } catch {
    _limiters = null
  }
  _initialized = true
  return _limiters?.[tier] ?? null
}

/**
 * Apply rate limiting to a request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 * Gracefully skips if Redis is not configured.
 */
export async function rateLimit(
  request: Request,
  tier: RateLimitTier = 'api'
): Promise<NextResponse | null> {
  const limiter = await getLimiter(tier)
  if (!limiter) return null

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const identifier = `${ip}:${new URL(request.url).pathname}`

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }
  } catch {
    return null
  }

  return null
}
