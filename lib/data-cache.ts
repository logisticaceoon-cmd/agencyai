/**
 * Module-level TTL cache for client-side fetches.
 * Persists across component remounts — eliminates redundant fetches on tab switch.
 */

interface CacheEntry {
  data: unknown
  ts: number
}

const cache = new Map<string, CacheEntry>()

// Default TTL: 60 seconds
const DEFAULT_TTL = 60_000

export async function cachedFetch<T = unknown>(
  url: string,
  options?: RequestInit,
  ttl = DEFAULT_TTL
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(url)
  if (cached && (now - cached.ts) < ttl) {
    return cached.data as T
  }
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data = await res.json()
  cache.set(url, { data, ts: now })
  return data as T
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

