/**
 * Module-level TTL cache for client-side fetches.
 * Persists across component remounts — eliminates redundant fetches on tab switch.
 */

interface CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  ts: number
}

const cache = new Map<string, CacheEntry>()

// Default TTL: 60 seconds
const DEFAULT_TTL = 60_000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl = DEFAULT_TTL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const now = Date.now()
  const cached = cache.get(url)
  if (cached && (now - cached.ts) < ttl) {
    return cached.data
  }
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data = await res.json()
  cache.set(url, { data, ts: now })
  return data
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
