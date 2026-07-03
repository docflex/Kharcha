import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * The cache module bypasses in NODE_ENV=test. We need to override that
 * to test the actual logic. We do this by stubbing process.env.NODE_ENV
 * before importing.
 */

describe("Cache — LRU with TTL and tag invalidation", () => {
    // We need to dynamically import after setting NODE_ENV
    let cacheGet: typeof import("@/lib/cache/index").cacheGet;
    let cacheInvalidate: typeof import("@/lib/cache/index").cacheInvalidate;
    let cacheInvalidateByTags: typeof import("@/lib/cache/index").cacheInvalidateByTags;
    let cacheClear: typeof import("@/lib/cache/index").cacheClear;
    let cacheStats: typeof import("@/lib/cache/index").cacheStats;

    beforeEach(async () => {
        // Set NODE_ENV to something other than "test" before importing
        vi.stubEnv("NODE_ENV", "development");

        // Reset module registry so the cache module re-evaluates
        vi.resetModules();

        const mod = await import("@/lib/cache/index");
        cacheGet = mod.cacheGet;
        cacheInvalidate = mod.cacheInvalidate;
        cacheInvalidateByTags = mod.cacheInvalidateByTags;
        cacheClear = mod.cacheClear;
        cacheStats = mod.cacheStats;

        // Start clean
        cacheClear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    // ─── Basic cache hit / miss ─────────────────────────────────────────

    it("returns cached value on cache hit (fetcher not called twice)", async () => {
        let callCount = 0;
        const fetcher = async () => {
            callCount++;
            return { data: "hello" };
        };

        const first = await cacheGet("key1", fetcher, { ttl: 60000 });
        const second = await cacheGet("key1", fetcher, { ttl: 60000 });

        expect(first).toEqual({ data: "hello" });
        expect(second).toEqual({ data: "hello" });
        expect(callCount).toBe(1);
    });

    it("calls fetcher on cache miss", async () => {
        let callCount = 0;
        const fetcher = async () => {
            callCount++;
            return 42;
        };

        await cacheGet("miss-key", fetcher, { ttl: 60000 });
        expect(callCount).toBe(1);
    });

    // ─── TTL expiry ─────────────────────────────────────────────────────

    it("re-fetches after TTL expires", async () => {
        let callCount = 0;
        const fetcher = async () => ++callCount;

        vi.useFakeTimers();

        await cacheGet("ttl-key", fetcher, { ttl: 1000 });
        expect(callCount).toBe(1);

        // Advance past TTL
        vi.advanceTimersByTime(1500);

        await cacheGet("ttl-key", fetcher, { ttl: 1000 });
        expect(callCount).toBe(2);

        vi.useRealTimers();
    });

    // ─── LRU eviction ───────────────────────────────────────────────────

    it("evicts oldest entry when MAX_ENTRIES (500) is reached", async () => {
        // Fill up the cache to capacity
        for (let i = 0; i < 500; i++) {
            await cacheGet(`fill-${i}`, async () => i, { ttl: 60000 });
        }

        expect(cacheStats().size).toBe(500);

        // Adding one more should evict the oldest (fill-0)
        let evictedFetcherCalled = false;
        await cacheGet("new-entry", async () => "new", { ttl: 60000 });

        // The cache should still be at MAX_ENTRIES
        expect(cacheStats().size).toBe(500);

        // fill-0 should be evicted — fetcher should be called again
        await cacheGet(
            "fill-0",
            async () => {
                evictedFetcherCalled = true;
                return "refetched";
            },
            { ttl: 60000 }
        );

        expect(evictedFetcherCalled).toBe(true);
    });

    // ─── cacheInvalidate — single key ───────────────────────────────────

    it("invalidates a single key", async () => {
        let callCount = 0;
        const fetcher = async () => ++callCount;

        await cacheGet("inv-key", fetcher, { ttl: 60000 });
        expect(callCount).toBe(1);

        cacheInvalidate("inv-key");

        await cacheGet("inv-key", fetcher, { ttl: 60000 });
        expect(callCount).toBe(2);
    });

    // ─── cacheInvalidateByTags ──────────────────────────────────────────

    it("invalidates entries matching ALL given tags", async () => {
        const fetchCount = { a: 0, b: 0 };

        await cacheGet("tagged-a", async () => ++fetchCount.a, {
            ttl: 60000,
            tags: ["expenses", "user1"],
        });

        await cacheGet("tagged-b", async () => ++fetchCount.b, {
            ttl: 60000,
            tags: ["expenses", "user2"],
        });

        expect(fetchCount).toEqual({ a: 1, b: 1 });

        // Invalidate only user1's expenses
        cacheInvalidateByTags(["expenses", "user1"]);

        await cacheGet("tagged-a", async () => ++fetchCount.a, {
            ttl: 60000,
            tags: ["expenses", "user1"],
        });
        await cacheGet("tagged-b", async () => ++fetchCount.b, {
            ttl: 60000,
            tags: ["expenses", "user2"],
        });

        expect(fetchCount.a).toBe(2); // re-fetched
        expect(fetchCount.b).toBe(1); // still cached
    });

    it("does not invalidate when tags only partially match", async () => {
        let callCount = 0;

        await cacheGet("partial-tag", async () => ++callCount, {
            ttl: 60000,
            tags: ["expenses", "user1"],
        });

        cacheInvalidateByTags(["expenses", "user999"]);

        await cacheGet("partial-tag", async () => ++callCount, {
            ttl: 60000,
            tags: ["expenses", "user1"],
        });

        expect(callCount).toBe(1); // not re-fetched
    });

    it("handles invalidateByTags when no entries match", () => {
        // Should not throw
        cacheInvalidateByTags(["nonexistent-tag"]);
        expect(cacheStats().size).toBe(0);
    });

    // ─── cacheClear ─────────────────────────────────────────────────────

    it("clears all entries", async () => {
        await cacheGet("c1", async () => 1, { ttl: 60000 });
        await cacheGet("c2", async () => 2, { ttl: 60000 });

        expect(cacheStats().size).toBe(2);

        cacheClear();

        expect(cacheStats().size).toBe(0);
    });

    // ─── cacheStats ─────────────────────────────────────────────────────

    it("reports correct size and maxSize", async () => {
        await cacheGet("s1", async () => "a", { ttl: 60000 });
        await cacheGet("s2", async () => "b", { ttl: 60000 });

        const stats = cacheStats();
        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(500);
    });

    // ─── Default TTL ────────────────────────────────────────────────────

    it("uses default 5-minute TTL when no ttl option is given", async () => {
        let callCount = 0;
        const fetcher = async () => ++callCount;

        vi.useFakeTimers();

        await cacheGet("default-ttl", fetcher);
        expect(callCount).toBe(1);

        // 4 minutes — still within default 5min TTL
        vi.advanceTimersByTime(4 * 60 * 1000);
        await cacheGet("default-ttl", fetcher);
        expect(callCount).toBe(1);

        // 6 minutes total — past default TTL
        vi.advanceTimersByTime(2 * 60 * 1000);
        await cacheGet("default-ttl", fetcher);
        expect(callCount).toBe(2);

        vi.useRealTimers();
    });
});
