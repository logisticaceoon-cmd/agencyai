/**
 * Module-level TTL cache — stale-while-revalidate pattern.
 * - First visit: fetches and waits (cold cache, unavoidable)
 * - Return visits: returns stale data INSTANTLY, refreshes in background
 * - Persists across component remounts — no reload on tab switch
 */

interface CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  ts: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

// Fresh window: data served directly, no background refresh
const FRESH_TTL = 30_000       // 30 seconds — fully fresh
// Stale window: data served instantly, background refresh kicks in
const STALE_TTL = 300_000      // 5 minutes — stale but usable

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function doFetch(url: string, options?: RequestInit): Promise<any> {
  // Deduplicate concurrent requests to same URL
  if (inflight.has(url)) return inflight.get(url)
  const p = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.json()
    })
    .then(data => {
      cache.set(url, { data, ts: Date.now() })
      inflight.delete(url)
      return data
    })
    .catch(err => {
      inflight.delete(url)
      throw err
    })
  inflight.set(url, p)
  return p
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl = FRESH_TTL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const now = Date.now()
  const cached = cache.get(url)

  if (cached) {
    const age = now - cached.ts
    if (age < ttl) {
      // Fully fresh — return immediately, no background work
      return cached.data
    }
    if (age < STALE_TTL) {
      // Stale but usable — return NOW, refresh silently in background
      doFetch(url, options).catch(() => {/* background refresh failed, keep stale */})
      return cached.data
    }
  }

  // No cache or too old — must wait
  return doFetch(url, options)
}

export function invalidateCache(pattern?: string) {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}

// Pre-warm: fire requests without waiting — useful for nav hover prefetch
export function prefetch(urls: string[]) {
  urls.forEach(url => {
    if (!cache.has(url) && !inflight.has(url)) {
      doFetch(url).catch(() => {/* silent */})
    }
  })
}
