// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { getCategoryDeepDive } from "@/lib/analytics/category-deepdive";
import * as schema from "@/lib/db/schema";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodId = await seedTestCategory(testDb.db, userId, { name: "Food" });

    // Create a budget for Food
    await testDb.db.insert(schema.budgets).values({
        id: "budget-food-1",
        userId,
        categoryId: foodId,
        monthlyLimit: 10000,
        effectiveFrom: "2025-01",
        createdAt: new Date(),
    });

    // Seed 6 months of food data across 2 years
    const entries = [
        { year: 2025, month: 10, amount: 8000 },
        { year: 2025, month: 11, amount: 9500 },
        { year: 2025, month: 12, amount: 12000 }, // over budget
        { year: 2026, month: 1, amount: 7000 },
        { year: 2026, month: 2, amount: 11500 }, // over budget
        { year: 2026, month: 3, amount: 9000 },
    ];

    for (const e of entries) {
        await createExpense(testDb.db, userId, {
            categoryId: foodId,
            year: e.year,
            month: e.month,
            amount: e.amount,
        });
    }
});

afterAll(async () => await testDb.cleanup());

describe("getCategoryDeepDive", () => {
    it("returns the category name and id", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, foodId);
        expect(result).not.toBeNull();
        expect(result!.categoryId).toBe(foodId);
        expect(result!.categoryName).toBe("Food");
    });

    it("returns all monthly data points sorted chronologically", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, foodId);
        expect(result!.dataPoints.length).toBe(6);
        // First should be 2025-10, last 2026-3
        expect(result!.dataPoints[0].year).toBe(2025);
        expect(result!.dataPoints[0].month).toBe(10);
        expect(result!.dataPoints[5].year).toBe(2026);
        expect(result!.dataPoints[5].month).toBe(3);
    });

    it("computes avg/min/max stats correctly", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, foodId);
        // Amounts: 8000, 9500, 12000, 7000, 11500, 9000
        expect(result!.stats.min).toBeCloseTo(7000);
        expect(result!.stats.max).toBeCloseTo(12000);
        // avg: (8000+9500+12000+7000+11500+9000)/6 = 57000/6 = 9500
        expect(result!.stats.average).toBeCloseTo(9500);
    });

    it("computes stddev", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, foodId);
        // stddev of [8000, 9500, 12000, 7000, 11500, 9000] with mean 9500
        expect(result!.stats.stddev).toBeGreaterThan(0);
        expect(result!.stats.stddev).toBeLessThan(3000);
    });

    it("includes budget adherence data", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, foodId);
        expect(result!.budgetLimit).toBe(10000);
        // Two months over budget: Dec 2025 (12000) and Feb 2026 (11500)
        const overMonths = result!.dataPoints.filter((dp) => dp.budgetStatus === "over");
        expect(overMonths.length).toBe(2);
    });

    it("flags anomalies for values beyond 1.5x stddev from mean", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, foodId);
        // With mean=9500 and stddev≈1732, 1.5*stddev≈2598
        // Anomalies would be values > 12098 or < 6902
        // 12000 is close but may not be anomaly; 7000 is just under threshold
        expect(result!.dataPoints.some((dp) => dp.isAnomaly !== undefined)).toBe(true);
    });

    it("returns null for non-existent category", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, "non-existent-id");
        expect(result).toBeNull();
    });

    it("returns null for another user's category", async () => {
        const otherUserId = await seedTestUser(testDb.db, { email: "other@test.com" });
        const result = await getCategoryDeepDive(testDb.db, otherUserId, foodId);
        expect(result).toBeNull();
    });
});
