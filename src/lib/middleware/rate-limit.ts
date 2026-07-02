/**
 * In-memory sliding window rate limiter.
 * Each window tracks request counts per key (IP or userId).
 * Resets on cold start — acceptable for personal app.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimiterOptions {
    windowMs: number;
    maxRequests: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
    if (!stores.has(name)) {
        stores.set(name, new Map());
    }
    return stores.get(name)!;
}

export function createRateLimiter(name: string, options: RateLimiterOptions) {
    const store = getStore(name);

    return {
        check(key: string): RateLimitResult {
            const now = Date.now();
            const entry = store.get(key);

            // No entry or window expired — reset
            if (!entry || now >= entry.resetAt) {
                store.set(key, { count: 1, resetAt: now + options.windowMs });
                return {
                    allowed: true,
                    remaining: options.maxRequests - 1,
                    retryAfterMs: 0,
                };
            }

            // Within window
            entry.count++;
            if (entry.count > options.maxRequests) {
                return {
                    allowed: false,
                    remaining: 0,
                    retryAfterMs: entry.resetAt - now,
                };
            }

            return {
                allowed: true,
                remaining: options.maxRequests - entry.count,
                retryAfterMs: 0,
            };
        },

        reset(key: string): void {
            store.delete(key);
        },

        /** Clear all entries — useful for testing */
        clear(): void {
            store.clear();
        },
    };
}

// ─── Pre-configured Limiters ────────────────────────────────────────────────

/** Login: 5 attempts / 15 minutes per IP */
export const authLimiter = createRateLimiter("auth", {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
});

/** Registration: 3 attempts / hour per IP */
export const registerLimiter = createRateLimiter("register", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
});

/** General API: 100 requests / minute per user */
export const apiLimiter = createRateLimiter("api", {
    windowMs: 60 * 1000,
    maxRequests: 100,
});
