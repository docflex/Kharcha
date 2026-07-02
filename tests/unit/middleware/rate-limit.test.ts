// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
    createRateLimiter,
    authLimiter,
    registerLimiter,
    apiLimiter,
} from "@/lib/middleware/rate-limit";

describe("Rate Limiter", () => {
    describe("createRateLimiter", () => {
        let limiter: ReturnType<typeof createRateLimiter>;

        beforeEach(() => {
            limiter = createRateLimiter("test", {
                windowMs: 1000,
                maxRequests: 3,
            });
            limiter.clear();
        });

        it("allows requests within limit", () => {
            const r1 = limiter.check("key1");
            expect(r1.allowed).toBe(true);
            expect(r1.remaining).toBe(2);

            const r2 = limiter.check("key1");
            expect(r2.allowed).toBe(true);
            expect(r2.remaining).toBe(1);

            const r3 = limiter.check("key1");
            expect(r3.allowed).toBe(true);
            expect(r3.remaining).toBe(0);
        });

        it("blocks requests exceeding limit", () => {
            limiter.check("key1");
            limiter.check("key1");
            limiter.check("key1");

            const r4 = limiter.check("key1");
            expect(r4.allowed).toBe(false);
            expect(r4.remaining).toBe(0);
            expect(r4.retryAfterMs).toBeGreaterThan(0);
        });

        it("tracks different keys independently", () => {
            limiter.check("key1");
            limiter.check("key1");
            limiter.check("key1");

            const r1 = limiter.check("key1");
            expect(r1.allowed).toBe(false);

            const r2 = limiter.check("key2");
            expect(r2.allowed).toBe(true);
            expect(r2.remaining).toBe(2);
        });

        it("resets window after expiry", async () => {
            limiter.check("key1");
            limiter.check("key1");
            limiter.check("key1");
            expect(limiter.check("key1").allowed).toBe(false);

            // Wait for window to expire
            await new Promise((r) => setTimeout(r, 1100));

            const result = limiter.check("key1");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(2);
        });

        it("reset() clears a specific key", () => {
            limiter.check("key1");
            limiter.check("key1");
            limiter.check("key1");
            expect(limiter.check("key1").allowed).toBe(false);

            limiter.reset("key1");
            expect(limiter.check("key1").allowed).toBe(true);
        });

        it("clear() clears all keys", () => {
            limiter.check("key1");
            limiter.check("key1");
            limiter.check("key1");
            limiter.check("key2");
            limiter.check("key2");
            limiter.check("key2");

            limiter.clear();

            expect(limiter.check("key1").allowed).toBe(true);
            expect(limiter.check("key2").allowed).toBe(true);
        });
    });

    describe("Pre-configured limiters", () => {
        beforeEach(() => {
            authLimiter.clear();
            registerLimiter.clear();
            apiLimiter.clear();
        });

        it("authLimiter allows 5 requests", () => {
            for (let i = 0; i < 5; i++) {
                expect(authLimiter.check("ip1").allowed).toBe(true);
            }
            expect(authLimiter.check("ip1").allowed).toBe(false);
        });

        it("registerLimiter allows 3 requests", () => {
            for (let i = 0; i < 3; i++) {
                expect(registerLimiter.check("ip1").allowed).toBe(true);
            }
            expect(registerLimiter.check("ip1").allowed).toBe(false);
        });

        it("apiLimiter allows 100 requests", () => {
            for (let i = 0; i < 100; i++) {
                expect(apiLimiter.check("ip1").allowed).toBe(true);
            }
            expect(apiLimiter.check("ip1").allowed).toBe(false);
        });
    });
});
