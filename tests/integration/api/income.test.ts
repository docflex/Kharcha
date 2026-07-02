import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import {
    createIncome,
    getIncome,
    deleteIncome,
    updateIncome,
    upsertIncome,
} from "@/lib/services/income-service";

describe("Income Service", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
    });

    afterEach(async () => await cleanup());

    describe("createIncome", () => {
        it("creates a salary income entry", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 136204.33,
                source: "salary",
            });

            expect(entry).toBeDefined();
            expect(entry.id).toBeTruthy();
            expect(entry.userId).toBe(userId);
            expect(entry.year).toBe(2026);
            expect(entry.month).toBe(6);
            expect(entry.amount).toBe(136204.33);
            expect(entry.source).toBe("salary");
        });

        it("creates a bonus income entry", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 143565,
                source: "bonus",
            });

            expect(entry.source).toBe("bonus");
            expect(entry.amount).toBe(143565);
        });

        it("creates side income entry", async () => {
            const entry = await createIncome(db, userId, {
                year: 2025,
                month: 3,
                amount: 25000,
                source: "freelance",
            });

            expect(entry.source).toBe("freelance");
        });

        it("allows multiple sources for the same month", async () => {
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 120373.67,
                source: "salary",
            });

            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 143565,
                source: "bonus",
            });

            const entries = await getIncome(db, userId, { year: 2026, month: 1 });
            expect(entries.length).toBe(2);

            const total = entries.reduce((s, e) => s + e.amount, 0);
            expect(total).toBeCloseTo(263938.67, 2);
        });

        it("rejects duplicate source for same month", async () => {
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 120000,
                source: "salary",
            });

            await expect(
                createIncome(db, userId, {
                    year: 2026,
                    month: 1,
                    amount: 130000,
                    source: "salary",
                })
            ).rejects.toThrow();
        });
    });

    describe("getIncome", () => {
        beforeEach(async () => {
            await createIncome(db, userId, {
                year: 2025,
                month: 11,
                amount: 120444.67,
                source: "salary",
            });
            await createIncome(db, userId, {
                year: 2025,
                month: 12,
                amount: 121572.67,
                source: "salary",
            });
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 120373.67,
                source: "salary",
            });
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 143565,
                source: "bonus",
            });
            await createIncome(db, userId, {
                year: 2026,
                month: 2,
                amount: 150718.99,
                source: "salary",
            });
        });

        it("returns all income entries when no filters", async () => {
            const entries = await getIncome(db, userId);
            expect(entries.length).toBe(5);
        });

        it("filters by year", async () => {
            const entries = await getIncome(db, userId, { year: 2026 });
            expect(entries.length).toBe(3);
        });

        it("filters by year and month", async () => {
            const entries = await getIncome(db, userId, { year: 2026, month: 1 });
            expect(entries.length).toBe(2);
        });

        it("returns empty array for non-existent period", async () => {
            const entries = await getIncome(db, userId, { year: 2024, month: 3 });
            expect(entries).toEqual([]);
        });

        it("scopes to the requesting user", async () => {
            const otherUser = await seedTestUser(db, { email: "other@test.com" });
            const entries = await getIncome(db, otherUser);
            expect(entries).toEqual([]);
        });

        it("returns entries ordered by year desc, month desc", async () => {
            const entries = await getIncome(db, userId);
            expect(entries[0].year).toBe(2026);
            expect(entries[entries.length - 1].year).toBe(2025);
        });
    });

    describe("deleteIncome", () => {
        it("deletes an existing entry", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 136204.33,
                source: "salary",
            });

            const deleted = await deleteIncome(db, userId, entry.id);
            expect(deleted).toBe(true);

            const remaining = await getIncome(db, userId);
            expect(remaining.length).toBe(0);
        });

        it("returns false for non-existent entry", async () => {
            const deleted = await deleteIncome(db, userId, "non-existent-id");
            expect(deleted).toBe(false);
        });

        it("prevents deleting another user's entry", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 136204.33,
                source: "salary",
            });

            const otherUser = await seedTestUser(db, { email: "other@test.com" });
            const deleted = await deleteIncome(db, otherUser, entry.id);
            expect(deleted).toBe(false);

            // Original still exists
            const entries = await getIncome(db, userId);
            expect(entries.length).toBe(1);
        });
    });

    describe("updateIncome", () => {
        it("updates amount on an existing entry", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 100000,
                source: "salary",
            });

            const updated = await updateIncome(db, userId, entry.id, { amount: 120000 });
            expect(updated).not.toBeNull();
            expect(updated!.amount).toBe(120000);
        });

        it("updates multiple fields at once", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 100000,
                source: "salary",
            });

            const updated = await updateIncome(db, userId, entry.id, {
                amount: 150000,
                source: "bonus",
            });
            expect(updated!.amount).toBe(150000);
            expect(updated!.source).toBe("bonus");
        });

        it("returns null for empty update (no fields)", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 100000,
                source: "salary",
            });

            const result = await updateIncome(db, userId, entry.id, {});
            expect(result).toBeNull();
        });

        it("returns null for non-existent entry", async () => {
            const result = await updateIncome(db, userId, "fake-id", { amount: 999 });
            expect(result).toBeNull();
        });

        it("prevents cross-user update", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 100000,
                source: "salary",
            });

            const otherUser = await seedTestUser(db, { email: "other-update@test.com" });
            const result = await updateIncome(db, otherUser, entry.id, { amount: 999 });
            expect(result).toBeNull();

            // Original unchanged
            const entries = await getIncome(db, userId, { year: 2026, month: 6 });
            expect(entries[0].amount).toBe(100000);
        });
    });

    describe("upsertIncome", () => {
        it("inserts new entry when none exists", async () => {
            const entry = await upsertIncome(db, userId, {
                year: 2026,
                month: 8,
                amount: 130000,
                source: "salary",
            });

            expect(entry).toBeDefined();
            expect(entry.amount).toBe(130000);
        });

        it("updates existing entry on conflict (same user/year/month/source)", async () => {
            await createIncome(db, userId, {
                year: 2026,
                month: 9,
                amount: 100000,
                source: "salary",
            });

            const upserted = await upsertIncome(db, userId, {
                year: 2026,
                month: 9,
                amount: 150000,
                source: "salary",
            });

            expect(upserted.amount).toBe(150000);

            // Should still be just 1 entry, not 2
            const entries = await getIncome(db, userId, { year: 2026, month: 9 });
            expect(entries).toHaveLength(1);
        });

        it("does not affect different sources in the same month", async () => {
            await createIncome(db, userId, {
                year: 2026,
                month: 10,
                amount: 100000,
                source: "salary",
            });

            await upsertIncome(db, userId, {
                year: 2026,
                month: 10,
                amount: 50000,
                source: "bonus",
            });

            const entries = await getIncome(db, userId, { year: 2026, month: 10 });
            expect(entries).toHaveLength(2);
        });
    });

    describe("edge cases", () => {
        it("handles very small amounts", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 0.01,
                source: "other",
            });
            expect(entry.amount).toBe(0.01);
        });

        it("handles very large amounts", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 99999999.99,
                source: "salary",
            });
            expect(entry.amount).toBe(99999999.99);
        });

        it("handles all 12 months", async () => {
            for (let m = 1; m <= 12; m++) {
                await createIncome(db, userId, {
                    year: 2025,
                    month: m,
                    amount: 100000 + m * 1000,
                    source: "salary",
                });
            }
            const entries = await getIncome(db, userId, { year: 2025 });
            expect(entries.length).toBe(12);
        });

        it("handles many source types in same month", async () => {
            const sources = ["salary", "bonus", "freelance", "rental", "side"];
            for (const source of sources) {
                await createIncome(db, userId, {
                    year: 2026,
                    month: 3,
                    amount: 10000,
                    source,
                });
            }
            const entries = await getIncome(db, userId, { year: 2026, month: 3 });
            expect(entries.length).toBe(5);
        });
    });
});
