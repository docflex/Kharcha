// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { getYoYComparison } from "@/lib/analytics/yoy";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodId: string;
let rentId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentId = await seedTestCategory(testDb.db, userId, { name: "Rent" });

    // June data across 3 years
    // 2024 June
    await createExpense(testDb.db, userId, {
        categoryId: foodId,
        year: 2024,
        month: 6,
        amount: 7000,
    });
    await createExpense(testDb.db, userId, {
        categoryId: rentId,
        year: 2024,
        month: 6,
        amount: 12000,
    });

    // 2025 June
    await createExpense(testDb.db, userId, {
        categoryId: foodId,
        year: 2025,
        month: 6,
        amount: 9000,
    });
    await createExpense(testDb.db, userId, {
        categoryId: rentId,
        year: 2025,
        month: 6,
        amount: 15000,
    });

    // 2026 June
    await createExpense(testDb.db, userId, {
        categoryId: foodId,
        year: 2026,
        month: 6,
        amount: 11000,
    });
    await createExpense(testDb.db, userId, {
        categoryId: rentId,
        year: 2026,
        month: 6,
        amount: 15000,
    });
});

afterAll(async () => await testDb.cleanup());

describe("getYoYComparison", () => {
    it("returns data for all years that have expenses in the given month", async () => {
        const yoy = await getYoYComparison(testDb.db, userId, 6);
        expect(yoy.years.length).toBe(3);
        expect(yoy.years.map((y) => y.year).sort()).toEqual([2024, 2025, 2026]);
    });

    it("returns correct total spending per year", async () => {
        const yoy = await getYoYComparison(testDb.db, userId, 6);
        const y2024 = yoy.years.find((y) => y.year === 2024);
        const y2025 = yoy.years.find((y) => y.year === 2025);
        const y2026 = yoy.years.find((y) => y.year === 2026);
        expect(y2024!.totalSpend).toBeCloseTo(19000);
        expect(y2025!.totalSpend).toBeCloseTo(24000);
        expect(y2026!.totalSpend).toBeCloseTo(26000);
    });

    it("returns per-category breakdown per year", async () => {
        const yoy = await getYoYComparison(testDb.db, userId, 6);
        const y2026 = yoy.years.find((y) => y.year === 2026);
        const food = y2026!.categories.find((c) => c.categoryName === "Food");
        expect(food!.amount).toBeCloseTo(11000);
    });

    it("returns the month in the result", async () => {
        const yoy = await getYoYComparison(testDb.db, userId, 6);
        expect(yoy.month).toBe(6);
    });

    it("returns empty years for a month with no data across any year", async () => {
        const yoy = await getYoYComparison(testDb.db, userId, 11); // November — no data
        expect(yoy.years).toHaveLength(0);
    });

    it("includes all categories — union across all years", async () => {
        const yoy = await getYoYComparison(testDb.db, userId, 6);
        // All years should have Food and Rent
        expect(yoy.allCategories.length).toBeGreaterThanOrEqual(2);
        expect(yoy.allCategories).toContain("Food");
        expect(yoy.allCategories).toContain("Rent");
    });
});
