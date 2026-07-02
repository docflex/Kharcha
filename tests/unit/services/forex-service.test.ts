// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/db/test-utils";
import { getRate, getAllRates } from "@/lib/services/forex-service";
import { forexRates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
    testDb = await createTestDb();
});

afterEach(async () => {
    await testDb.cleanup();
    vi.restoreAllMocks();
});

describe("Forex Service", () => {
    describe("getRate", () => {
        it("returns rate=1 for same currency (no API call)", async () => {
            const result = await getRate(testDb.db, "INR", "INR");
            expect(result.rate).toBe(1);
            expect(result.cached).toBe(true);
            expect(result.base).toBe("INR");
            expect(result.target).toBe("INR");
        });

        it("fetches from API and caches in DB", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ rates: { USD: 0.012 } }),
            });
            vi.stubGlobal("fetch", mockFetch);

            const result = await getRate(testDb.db, "INR", "USD");

            expect(result.rate).toBe(0.012);
            expect(result.cached).toBe(false);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Verify cached in DB
            const [cached] = await testDb.db
                .select()
                .from(forexRates)
                .where(and(eq(forexRates.base, "INR"), eq(forexRates.target, "USD")));
            expect(cached).toBeDefined();
            expect(cached!.rate).toBe(0.012);
        });

        it("returns cached rate without API call when cache is fresh", async () => {
            // Pre-populate cache
            await testDb.db.insert(forexRates).values({
                id: "INR-EUR",
                base: "INR",
                target: "EUR",
                rate: 0.011,
                fetchedAt: new Date(), // Fresh
            });

            const mockFetch = vi.fn();
            vi.stubGlobal("fetch", mockFetch);

            const result = await getRate(testDb.db, "INR", "EUR");

            expect(result.rate).toBe(0.011);
            expect(result.cached).toBe(true);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("re-fetches when cache is stale (>24h)", async () => {
            // Pre-populate with stale cache
            const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
            await testDb.db.insert(forexRates).values({
                id: "INR-GBP",
                base: "INR",
                target: "GBP",
                rate: 0.009,
                fetchedAt: staleDate,
            });

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ rates: { GBP: 0.0095 } }),
            });
            vi.stubGlobal("fetch", mockFetch);

            const result = await getRate(testDb.db, "INR", "GBP");

            expect(result.rate).toBe(0.0095);
            expect(result.cached).toBe(false);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it("throws when all APIs fail", async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
            vi.stubGlobal("fetch", mockFetch);

            await expect(getRate(testDb.db, "INR", "USD")).rejects.toThrow("Failed to fetch rate");
        });
    });

    describe("getAllRates", () => {
        it("returns cached rates without API calls", async () => {
            // Pre-populate cache
            await testDb.db.insert(forexRates).values([
                {
                    id: "INR-USD",
                    base: "INR",
                    target: "USD",
                    rate: 0.012,
                    fetchedAt: new Date(),
                },
                {
                    id: "INR-EUR",
                    base: "INR",
                    target: "EUR",
                    rate: 0.011,
                    fetchedAt: new Date(),
                },
            ]);

            const mockFetch = vi.fn();
            vi.stubGlobal("fetch", mockFetch);

            const rates = await getAllRates(testDb.db, "INR", ["USD", "EUR", "INR"]);

            expect(rates.USD).toBe(0.012);
            expect(rates.EUR).toBe(0.011);
            expect(rates.INR).toBe(1); // Self-rate
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("batch-fetches only stale/missing rates", async () => {
            // USD is cached fresh, EUR is stale
            await testDb.db.insert(forexRates).values([
                {
                    id: "INR-USD",
                    base: "INR",
                    target: "USD",
                    rate: 0.012,
                    fetchedAt: new Date(),
                },
                {
                    id: "INR-EUR",
                    base: "INR",
                    target: "EUR",
                    rate: 0.011,
                    fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
                },
            ]);

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ rates: { EUR: 0.0115, GBP: 0.0095 } }),
            });
            vi.stubGlobal("fetch", mockFetch);

            const rates = await getAllRates(testDb.db, "INR", ["USD", "EUR", "GBP"]);

            expect(rates.USD).toBe(0.012); // From cache
            expect(rates.EUR).toBe(0.0115); // Freshly fetched
            expect(rates.GBP).toBe(0.0095); // Freshly fetched
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // URL should only request stale currencies
            const url = mockFetch.mock.calls[0][0] as string;
            expect(url).toContain("EUR");
            expect(url).toContain("GBP");
            expect(url).not.toContain("USD");
        });

        it("handles all rates cached", async () => {
            await testDb.db.insert(forexRates).values({
                id: "INR-USD",
                base: "INR",
                target: "USD",
                rate: 0.012,
                fetchedAt: new Date(),
            });

            const mockFetch = vi.fn();
            vi.stubGlobal("fetch", mockFetch);

            const rates = await getAllRates(testDb.db, "INR", ["USD"]);

            expect(rates.USD).toBe(0.012);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("throws when all APIs fail", async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
            vi.stubGlobal("fetch", mockFetch);

            await expect(getAllRates(testDb.db, "INR", ["USD", "EUR"])).rejects.toThrow(
                "Failed to fetch exchange rates"
            );
        });
    });
});
