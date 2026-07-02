import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import {
    createBudget,
    getBudgets,
    getActiveBudget,
    updateBudget,
    deleteBudget,
} from "@/lib/services/budget-service";

describe("Budget Service — Edge Cases", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let catFood: string;
    let catRent: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        catFood = await seedTestCategory(db, userId, { name: "Food" });
        catRent = await seedTestCategory(db, userId, { name: "Rent" });
    });

    afterEach(async () => await cleanup());

    describe("validation edge cases", () => {
        it("rejects zero monthly limit", async () => {
            await expect(
                createBudget(db, userId, {
                    categoryId: catFood,
                    monthlyLimit: 0,
                    effectiveFrom: "2026-01",
                })
            ).rejects.toThrow();
        });

        it("rejects negative monthly limit", async () => {
            await expect(
                createBudget(db, userId, {
                    categoryId: catFood,
                    monthlyLimit: -1000,
                    effectiveFrom: "2026-01",
                })
            ).rejects.toThrow();
        });

        it("accepts very large monthly limit", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 10000000,
                effectiveFrom: "2026-01",
            });
            expect(budget.monthlyLimit).toBe(10000000);
        });
    });

    describe("active budget logic", () => {
        it("returns active budget when month equals effectiveFrom", async () => {
            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-06",
            });

            const active = await getActiveBudget(db, userId, catFood, "2026-06");
            expect(active).toBeDefined();
            expect(active!.monthlyLimit).toBe(5000);
        });

        it("returns active budget when month equals effectiveUntil", async () => {
            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-01",
                effectiveUntil: "2026-06",
            });

            const active = await getActiveBudget(db, userId, catFood, "2026-06");
            expect(active).toBeDefined();
        });

        it("returns null when month is one after effectiveUntil", async () => {
            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-01",
                effectiveUntil: "2026-06",
            });

            const active = await getActiveBudget(db, userId, catFood, "2026-07");
            expect(active).toBeNull();
        });

        it("returns null when month is before effectiveFrom", async () => {
            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-06",
            });

            const active = await getActiveBudget(db, userId, catFood, "2026-05");
            expect(active).toBeNull();
        });

        it("open-ended budget stays active indefinitely", async () => {
            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2024-01",
            });

            const active = await getActiveBudget(db, userId, catFood, "2030-12");
            expect(active).toBeDefined();
        });
    });

    describe("multi-user isolation", () => {
        it("user A cannot see user B budgets", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await seedTestCategory(db, userB, { name: "Food" });

            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-01",
            });
            await createBudget(db, userB, {
                categoryId: catB,
                monthlyLimit: 8000,
                effectiveFrom: "2026-01",
            });

            const mine = await getBudgets(db, userId);
            expect(mine).toHaveLength(1);
            expect(mine[0].monthlyLimit).toBe(5000);
        });

        it("user A cannot update user B budget", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await seedTestCategory(db, userB, { name: "Food" });
            const budgetB = await createBudget(db, userB, {
                categoryId: catB,
                monthlyLimit: 8000,
                effectiveFrom: "2026-01",
            });

            const result = await updateBudget(db, userId, budgetB.id, { monthlyLimit: 1 });
            expect(result).toBeNull();
        });

        it("user A cannot delete user B budget", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await seedTestCategory(db, userB, { name: "Food" });
            const budgetB = await createBudget(db, userB, {
                categoryId: catB,
                monthlyLimit: 8000,
                effectiveFrom: "2026-01",
            });

            const deleted = await deleteBudget(db, userId, budgetB.id);
            expect(deleted).toBe(false);
        });
    });

    describe("update edge cases", () => {
        it("updates effectiveFrom", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-01",
            });

            const updated = await updateBudget(db, userId, budget.id, {
                effectiveFrom: "2026-03",
            });
            expect(updated!.effectiveFrom).toBe("2026-03");
        });

        it("sets effectiveUntil on open-ended budget", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-01",
            });

            const updated = await updateBudget(db, userId, budget.id, {
                effectiveUntil: "2026-12",
            });
            expect(updated!.effectiveUntil).toBe("2026-12");
        });

        it("returns null for non-existent budget", async () => {
            const result = await updateBudget(db, userId, "nonexistent", { monthlyLimit: 1 });
            expect(result).toBeNull();
        });
    });

    describe("delete edge cases", () => {
        it("returns false for non-existent budget", async () => {
            const result = await deleteBudget(db, userId, "nonexistent");
            expect(result).toBe(false);
        });

        it("budget is truly gone after delete", async () => {
            const budget = await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 5000,
                effectiveFrom: "2026-01",
            });

            await deleteBudget(db, userId, budget.id);
            const all = await getBudgets(db, userId);
            expect(all).toHaveLength(0);
        });
    });
});
