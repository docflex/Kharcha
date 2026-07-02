// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
    createRateLimiter,
    authLimiter,
    registerLimiter,
    apiLimiter,
} from "@/lib/middleware/rate-limit";

/**
 * Integration tests for rate limiting behavior.
 * Verifies that the middleware-level rate limiters enforce correct limits
 * for different API endpoint categories.
 */

describe("Rate Limiting — Integration", () => {
    beforeEach(() => {
        authLimiter.clear();
        registerLimiter.clear();
        apiLimiter.clear();
    });

    // ─── Registration rate limiter (3/hour) ────────────────────────────

    describe("registerLimiter", () => {
        it("allows exactly 3 registration attempts per IP", () => {
            for (let i = 0; i < 3; i++) {
                const result = registerLimiter.check("register:192.168.1.1");
                expect(result.allowed).toBe(true);
            }
            const blocked = registerLimiter.check("register:192.168.1.1");
            expect(blocked.allowed).toBe(false);
            expect(blocked.retryAfterMs).toBeGreaterThan(0);
        });

        it("tracks different IPs independently", () => {
            // Exhaust IP1
            for (let i = 0; i < 3; i++) {
                registerLimiter.check("register:10.0.0.1");
            }
            expect(registerLimiter.check("register:10.0.0.1").allowed).toBe(false);

            // IP2 should still be allowed
            expect(registerLimiter.check("register:10.0.0.2").allowed).toBe(true);
        });
    });

    // ─── Auth rate limiter (5/15min) ──────────────────────────────────

    describe("authLimiter", () => {
        it("allows exactly 5 login attempts per IP", () => {
            for (let i = 0; i < 5; i++) {
                const result = authLimiter.check("auth:192.168.1.1");
                expect(result.allowed).toBe(true);
            }
            const blocked = authLimiter.check("auth:192.168.1.1");
            expect(blocked.allowed).toBe(false);
        });

        it("returns remaining count correctly", () => {
            const r1 = authLimiter.check("auth:counter-ip");
            expect(r1.remaining).toBe(4);

            const r2 = authLimiter.check("auth:counter-ip");
            expect(r2.remaining).toBe(3);
        });
    });

    // ─── API rate limiter (100/min) ──────────────────────────────────

    describe("apiLimiter", () => {
        it("allows 100 requests per minute per IP", () => {
            for (let i = 0; i < 100; i++) {
                expect(apiLimiter.check("api:general-ip").allowed).toBe(true);
            }
            expect(apiLimiter.check("api:general-ip").allowed).toBe(false);
        });
    });

    // ─── Custom limiter behavior ─────────────────────────────────────

    describe("createRateLimiter — custom config", () => {
        it("respects custom maxRequests and windowMs", () => {
            const limiter = createRateLimiter("custom", {
                windowMs: 5000,
                maxRequests: 2,
            });

            expect(limiter.check("k").allowed).toBe(true);
            expect(limiter.check("k").allowed).toBe(true);
            expect(limiter.check("k").allowed).toBe(false);
        });

        it("reset() allows requests again for a specific key", () => {
            const limiter = createRateLimiter("reset-test", {
                windowMs: 60000,
                maxRequests: 1,
            });

            expect(limiter.check("k").allowed).toBe(true);
            expect(limiter.check("k").allowed).toBe(false);

            limiter.reset("k");
            expect(limiter.check("k").allowed).toBe(true);
        });

        it("window expiry restores allowance", async () => {
            const limiter = createRateLimiter("expiry-test", {
                windowMs: 500,
                maxRequests: 1,
            });

            expect(limiter.check("k").allowed).toBe(true);
            expect(limiter.check("k").allowed).toBe(false);

            await new Promise((r) => setTimeout(r, 600));
            expect(limiter.check("k").allowed).toBe(true);
        });
    });
});
