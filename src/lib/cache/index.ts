/**
 * Server-side LRU cache with TTL and tag-based invalidation.
 * Module-scope Map — persists across requests in warm serverless instances.
 * Resets on cold start (safe — DB is always source of truth).
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    tags: string[];
}

const MAX_ENTRIES = 500;
const store = new Map<string, CacheEntry<unknown>>();
const accessOrder: string[] = []; // LRU tracking

function evictIfNeeded(): void {
    while (store.size >= MAX_ENTRIES) {
        const oldest = accessOrder.shift();
        if (oldest) store.delete(oldest);
    }
}

function touch(key: string): void {
    const idx = accessOrder.indexOf(key);
    if (idx > -1) accessOrder.splice(idx, 1);
    accessOrder.push(key);
}

function isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Read-through cache. Returns cached value if fresh, otherwise calls `fetcher`
 * and caches the result.
 *
 * @param key   Unique cache key (e.g., "profile:userId123")
 * @param fetcher  Async function that fetches from DB
 * @param opts.ttl  Time-to-live in ms (default: 5 minutes)
 * @param opts.tags Tags for bulk invalidation (e.g., ["profile", "userId123"])
 */
export async function cacheGet<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts?: { ttl?: number; tags?: string[] }
): Promise<T> {
    // Bypass in test environment
    if (process.env.NODE_ENV === "test") {
        return fetcher();
    }

    const existing = store.get(key) as CacheEntry<T> | undefined;
    if (existing && !isExpired(existing)) {
        touch(key);
        return existing.value;
    }

    // Cache miss — fetch from DB
    const value = await fetcher();
    const ttl = opts?.ttl ?? 5 * 60 * 1000; // default 5 min
    const tags = opts?.tags ?? [];

    evictIfNeeded();
    store.set(key, { value, expiresAt: Date.now() + ttl, tags });
    touch(key);

    return value;
}

/**
 * Invalidate a single cache entry by key.
 */
export function cacheInvalidate(key: string): void {
    store.delete(key);
    const idx = accessOrder.indexOf(key);
    if (idx > -1) accessOrder.splice(idx, 1);
}

/**
 * Invalidate all cache entries that contain ALL of the given tags.
 * E.g., invalidateByTags(["expenses", "user123"]) removes all entries
 * tagged with both "expenses" AND "user123".
 */
export function cacheInvalidateByTags(tags: string[]): void {
    const toDelete: string[] = [];
    for (const [key, entry] of store) {
        if (tags.every((t) => entry.tags.includes(t))) {
            toDelete.push(key);
        }
    }
    for (const key of toDelete) {
        store.delete(key);
        const idx = accessOrder.indexOf(key);
        if (idx > -1) accessOrder.splice(idx, 1);
    }
}

/**
 * Clear the entire cache. Useful for testing or admin actions.
 */
export function cacheClear(): void {
    store.clear();
    accessOrder.length = 0;
}

/**
 * Get cache stats (for debugging/monitoring).
 */
export function cacheStats(): { size: number; maxSize: number } {
    return { size: store.size, maxSize: MAX_ENTRIES };
}

// ─── TTL Presets ────────────────────────────────────────────────────────────

export const TTL = {
    SHORT: 4 * 60 * 60 * 1000, // 4 hours   — expenses, analytics
    MEDIUM: 8 * 60 * 60 * 1000, // 8 hours   — profile, categories, budgets, income
    LONG: 24 * 60 * 60 * 1000, // 24 hours  — persona
    DAY: 24 * 60 * 60 * 1000, // 24 hours   — forex rates
} as const;
