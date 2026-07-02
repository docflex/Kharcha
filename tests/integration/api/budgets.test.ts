import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import {
    createBudget,
    getBudgets,
    getActiveBudget,
    updateBudget,
    deleteBudget,
} from "@/lib/services/budget-service";

describe("Budget Service", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let foodCatId: string;
    let rentCatId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        foodCatId = await seedTestCategory(db, userId, { name: "Food" });
        rentCatId = await seedTestCategory(db, userId, { name: "Rent" });
    });

    afterEach(async () => await cleanup());

    describe("createBudget", () => {
        it("creates a budget target", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 10000,
                effectiveFrom: "2026-01",
            });

            expect(budget).toBeDefined();
            expect(budget.monthlyLimit).toBe(10000);
            expect(budget.effectiveFrom).toBe("2026-01");
            expect(budget.effectiveUntil).toBeNull();
        });

        it("creates a budget with end date", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 8000,
                effectiveFrom: "2026-01",
                effectiveUntil: "2026-06",
            });

            expect(budget.effectiveUntil).toBe("2026-06");
        });
    });

    describe("getBudgets", () => {
        it("returns all budgets for a user", async () => {
            await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 10000,
                effectiveFrom: "2026-01",
            });
            await createBudget(db, userId, {
                categoryId: rentCatId,
                monthlyLimit: 15000,
                effectiveFrom: "2026-01",
            });

            const budgets = await getBudgets(db, userId);
            expect(budgets).toHaveLength(2);
        });
    });

    describe("getActiveBudget", () => {
        it("returns the active budget for a category and month", async () => {
            await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 10000,
                effectiveFrom: "2026-01",
            });

            const active = await getActiveBudget(db, userId, foodCatId, "2026-06");
            expect(active).toBeDefined();
            expect(active!.monthlyLimit).toBe(10000);
        });

        it("returns null if budget expired", async () => {
            await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 10000,
                effectiveFrom: "2025-01",
                effectiveUntil: "2025-12",
            });

            const active = await getActiveBudget(db, userId, foodCatId, "2026-06");
            expect(active).toBeNull();
        });

        it("returns null if no budget set", async () => {
            const active = await getActiveBudget(db, userId, foodCatId, "2026-06");
            expect(active).toBeNull();
        });
    });

    describe("updateBudget", () => {
        it("updates the monthly limit", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 10000,
                effectiveFrom: "2026-01",
            });

            const updated = await updateBudget(db, userId, budget.id, {
                monthlyLimit: 12000,
            });

            expect(updated!.monthlyLimit).toBe(12000);
        });
    });

    describe("deleteBudget", () => {
        it("deletes a budget", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: foodCatId,
                monthlyLimit: 10000,
                effectiveFrom: "2026-01",
            });

            const deleted = await deleteBudget(db, userId, budget.id);
            expect(deleted).toBe(true);
        });
    });
});
