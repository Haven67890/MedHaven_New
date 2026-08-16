/**
 * Lightweight client-side in-memory cache to prevent redundant data re-fetching
 * when navigating between pages and tabs.
 */

interface CacheEntry<T> {
  data: T
  expiry: number
}

const cacheStore = new Map<string, CacheEntry<any>>()

/**
 * Retrieve cached data by key if present and not expired.
 */
export function getCachedData<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key)
    return null
  }
  return entry.data as T
}

/**
 * Store data in the cache with a time-to-live (default: 5 minutes).
 */
export function setCachedData<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  })
}

/**
 * Invalidate a specific cache entry or clear the entire cache.
 */
export function clearCache(key?: string): void {
  if (key) {
    cacheStore.delete(key)
  } else {
    cacheStore.clear()
  }
}
