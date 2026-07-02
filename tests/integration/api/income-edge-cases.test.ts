import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import { createIncome, getIncome, deleteIncome } from "@/lib/services/income-service";

describe("Income Service — Edge Cases", () => {
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

    describe("boundary months", () => {
        it("handles January (month 1)", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 100000,
                source: "salary",
            });
            expect(entry.month).toBe(1);
        });

        it("handles December (month 12)", async () => {
            const entry = await createIncome(db, userId, {
                year: 2025,
                month: 12,
                amount: 100000,
                source: "salary",
            });
            expect(entry.month).toBe(12);
        });
    });

    describe("concurrent entries", () => {
        it("handles salary + bonus + freelance in same month", async () => {
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 120000,
                source: "salary",
            });
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 50000,
                source: "bonus",
            });
            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 15000,
                source: "freelance",
            });

            const entries = await getIncome(db, userId, { year: 2026, month: 1 });
            expect(entries.length).toBe(3);

            const total = entries.reduce((s, e) => s + e.amount, 0);
            expect(total).toBe(185000);
        });
    });

    describe("cross-user isolation", () => {
        it("user A cannot see user B's income", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });

            await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 120000,
                source: "salary",
            });
            await createIncome(db, userB, {
                year: 2026,
                month: 1,
                amount: 80000,
                source: "salary",
            });

            const entriesA = await getIncome(db, userId);
            const entriesB = await getIncome(db, userB);

            expect(entriesA.length).toBe(1);
            expect(entriesA[0].amount).toBe(120000);

            expect(entriesB.length).toBe(1);
            expect(entriesB[0].amount).toBe(80000);
        });

        it("deleting user B's entry doesn't affect user A", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });

            const entryA = await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 120000,
                source: "salary",
            });
            const entryB = await createIncome(db, userB, {
                year: 2026,
                month: 1,
                amount: 80000,
                source: "salary",
            });

            await deleteIncome(db, userB, entryB.id);

            const entriesA = await getIncome(db, userId);
            expect(entriesA.length).toBe(1);
            expect(entriesA[0].id).toBe(entryA.id);
        });
    });

    describe("precision handling", () => {
        it("preserves decimal precision", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 6,
                amount: 136204.33,
                source: "salary",
            });
            expect(entry.amount).toBe(136204.33);
        });

        it("handles amounts with many decimal places", async () => {
            const entry = await createIncome(db, userId, {
                year: 2026,
                month: 1,
                amount: 150718.99,
                source: "salary",
            });
            expect(entry.amount).toBeCloseTo(150718.99, 2);
        });
    });
});
