// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { createBudget } from "@/lib/services/budget-service";
import { getBudgetOverview } from "@/lib/analytics/budget";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodId: string;
let rentId: string;
let gymId: string;
let shoppingId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentId = await seedTestCategory(testDb.db, userId, { name: "Rent" });
    gymId = await seedTestCategory(testDb.db, userId, { name: "Gym" });
    shoppingId = await seedTestCategory(testDb.db, userId, { name: "Shopping" });

    // Budgets (effective from 2026-01)
    await createBudget(testDb.db, userId, {
        categoryId: foodId,
        monthlyLimit: 10000,
        effectiveFrom: "2026-01",
    });
    await createBudget(testDb.db, userId, {
        categoryId: rentId,
        monthlyLimit: 16000,
        effectiveFrom: "2026-01",
    });
    await createBudget(testDb.db, userId, {
        categoryId: gymId,
        monthlyLimit: 2000,
        effectiveFrom: "2026-01",
    });
    // Shopping has no budget set

    // June 2026 expenses
    await createExpense(testDb.db, userId, {
        categoryId: foodId,
        year: 2026,
        month: 6,
        amount: 9824.8, // under budget
    });
    await createExpense(testDb.db, userId, {
        categoryId: rentId,
        year: 2026,
        month: 6,
        amount: 15000, // under budget
    });
    await createExpense(testDb.db, userId, {
        categoryId: gymId,
        year: 2026,
        month: 6,
        amount: 2500, // OVER budget (2500 > 2000)
    });
    await createExpense(testDb.db, userId, {
        categoryId: shoppingId,
        year: 2026,
        month: 6,
        amount: 387, // no budget
    });
});

afterAll(async () => await testDb.cleanup());

describe("getBudgetOverview", () => {
    it("returns statuses for all categories with budgets", async () => {
        const overview = await getBudgetOverview(testDb.db, userId, 2026, 6);
        expect(overview.year).toBe(2026);
        expect(overview.month).toBe(6);
        expect(overview.statuses).toHaveLength(3); // only budgeted categories
    });

    it("computes correct percentUsed", async () => {
        const overview = await getBudgetOverview(testDb.db, userId, 2026, 6);

        const food = overview.statuses.find((s) => s.categoryName === "Food");
        expect(food).toBeDefined();
        expect(food!.actual).toBeCloseTo(9824.8);
        expect(food!.budgetLimit).toBeCloseTo(10000);
        expect(food!.percentUsed).toBeCloseTo(98.25, 1);
        expect(food!.remaining).toBeCloseTo(175.2);
    });

    it("marks over-budget categories correctly", async () => {
        const overview = await getBudgetOverview(testDb.db, userId, 2026, 6);

        const gym = overview.statuses.find((s) => s.categoryName === "Gym");
        expect(gym).toBeDefined();
        expect(gym!.status).toBe("over");
        expect(gym!.remaining).toBeLessThan(0);
        expect(gym!.percentUsed).toBeGreaterThan(100);
    });

    it("assigns correct status thresholds", async () => {
        const overview = await getBudgetOverview(testDb.db, userId, 2026, 6);

        // Food is at 98.25% — "warning" (>= 80% and <= 100%)
        const food = overview.statuses.find((s) => s.categoryName === "Food");
        expect(food!.status).toBe("warning");

        // Rent is at 93.75% — "warning"
        const rent = overview.statuses.find((s) => s.categoryName === "Rent");
        expect(rent!.status).toBe("warning");

        // Gym is over — "over"
        const gym = overview.statuses.find((s) => s.categoryName === "Gym");
        expect(gym!.status).toBe("over");
    });

    it("counts over/under/on-track correctly", async () => {
        const overview = await getBudgetOverview(testDb.db, userId, 2026, 6);
        expect(overview.overBudgetCount).toBe(1); // Gym
        // Food and Rent are in warning zone (>80%), so they are on-track
        expect(overview.onTrackCount).toBe(2);
        expect(overview.underBudgetCount).toBe(0);
    });

    it("returns empty overview for month with no budgets", async () => {
        // Create separate user with no budgets
        const user2 = await seedTestUser(testDb.db, {
            email: "nobudget@test.com",
        });
        const overview = await getBudgetOverview(testDb.db, user2, 2026, 6);
        expect(overview.statuses).toHaveLength(0);
        expect(overview.overBudgetCount).toBe(0);
        expect(overview.underBudgetCount).toBe(0);
        expect(overview.onTrackCount).toBe(0);
    });

    it("handles categories with budget but no spending", async () => {
        // Gym budget exists for Jan 2026, but no expenses in Jan
        const overview = await getBudgetOverview(testDb.db, userId, 2026, 1);
        const gym = overview.statuses.find((s) => s.categoryName === "Gym");
        expect(gym).toBeDefined();
        expect(gym!.actual).toBe(0);
        expect(gym!.percentUsed).toBe(0);
        expect(gym!.status).toBe("under");
    });
});
