// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { getMonthSummary, getMoMComparison } from "@/lib/analytics/mom";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodId: string;
let rentId: string;
let investId: string;
let gymId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentId = await seedTestCategory(testDb.db, userId, { name: "Rent" });
    investId = await seedTestCategory(testDb.db, userId, {
        name: "Investments",
        type: "investment",
    });
    gymId = await seedTestCategory(testDb.db, userId, { name: "Gym" });

    // June 2026 expenses
    await createExpense(testDb.db, userId, {
        categoryId: foodId,
        year: 2026,
        month: 6,
        amount: 9824.8,
    });
    await createExpense(testDb.db, userId, {
        categoryId: rentId,
        year: 2026,
        month: 6,
        amount: 15000,
    });
    await createExpense(testDb.db, userId, {
        categoryId: investId,
        year: 2026,
        month: 6,
        amount: 200077,
        source: "ocr",
    });

    // May 2026 expenses
    await createExpense(testDb.db, userId, {
        categoryId: foodId,
        year: 2026,
        month: 5,
        amount: 11000,
    });
    await createExpense(testDb.db, userId, {
        categoryId: rentId,
        year: 2026,
        month: 5,
        amount: 15000,
    });
    await createExpense(testDb.db, userId, {
        categoryId: investId,
        year: 2026,
        month: 5,
        amount: 180000,
        source: "ocr",
    });
    await createExpense(testDb.db, userId, {
        categoryId: gymId,
        year: 2026,
        month: 5,
        amount: 1449,
    });
});

afterAll(async () => await testDb.cleanup());

describe("getMonthSummary", () => {
    it("returns correct totals for a month with data", async () => {
        const summary = await getMonthSummary(testDb.db, userId, 2026, 6);
        expect(summary.year).toBe(2026);
        expect(summary.month).toBe(6);
        expect(summary.totalSpend).toBeCloseTo(224901.8);
        expect(summary.totalInvestments).toBeCloseTo(200077);
        expect(summary.totalExpenses).toBeCloseTo(24824.8);
        expect(summary.categories).toHaveLength(3);
    });

    it("separates expense vs investment categories", async () => {
        const summary = await getMonthSummary(testDb.db, userId, 2026, 6);
        const investments = summary.categories.filter((c) => c.type === "investment");
        const expenses = summary.categories.filter((c) => c.type === "expense");
        expect(investments).toHaveLength(1);
        expect(investments[0].amount).toBeCloseTo(200077);
        expect(expenses).toHaveLength(2);
    });

    it("returns zero totals for a month with no data", async () => {
        const summary = await getMonthSummary(testDb.db, userId, 2026, 1);
        expect(summary.totalSpend).toBe(0);
        expect(summary.totalInvestments).toBe(0);
        expect(summary.totalExpenses).toBe(0);
        expect(summary.categories).toHaveLength(0);
    });
});

describe("getMoMComparison", () => {
    it("computes absolute and percent changes per category", async () => {
        const comparison = await getMoMComparison(testDb.db, userId, 2026, 6);

        expect(comparison.current).toEqual({ year: 2026, month: 6 });
        expect(comparison.previous).toEqual({ year: 2026, month: 5 });

        const food = comparison.categories.find((c) => c.categoryName === "Food");
        expect(food).toBeDefined();
        expect(food!.currentAmount).toBeCloseTo(9824.8);
        expect(food!.previousAmount).toBeCloseTo(11000);
        expect(food!.absoluteChange).toBeCloseTo(-1175.2);
        expect(food!.percentChange).toBeCloseTo(-10.68, 1);
    });

    it("reports total MoM change", async () => {
        const comparison = await getMoMComparison(testDb.db, userId, 2026, 6);
        expect(comparison.totalCurrentSpend).toBeCloseTo(224901.8);
        expect(comparison.totalPreviousSpend).toBeCloseTo(207449);
    });

    it("identifies new categories (present now, not before)", async () => {
        const comparison = await getMoMComparison(testDb.db, userId, 2026, 6);
        expect(comparison.newCategories).toHaveLength(0);
    });

    it("identifies dropped categories (present before, not now)", async () => {
        const comparison = await getMoMComparison(testDb.db, userId, 2026, 6);
        expect(comparison.droppedCategories).toContain("Gym");
    });

    it("handles January correctly (wraps to Dec of previous year)", async () => {
        // No data for Dec 2025 or Jan 2026, should still return valid result
        const comparison = await getMoMComparison(testDb.db, userId, 2026, 1);
        expect(comparison.current).toEqual({ year: 2026, month: 1 });
        expect(comparison.previous).toEqual({ year: 2025, month: 12 });
        expect(comparison.totalCurrentSpend).toBe(0);
        expect(comparison.totalPreviousSpend).toBe(0);
    });

    it("handles percent change when previous amount is zero", async () => {
        // Rent is in both months — same value — so it will have 0% change
        const comparison = await getMoMComparison(testDb.db, userId, 2026, 6);
        const rent = comparison.categories.find((c) => c.categoryName === "Rent");
        expect(rent).toBeDefined();
        expect(rent!.percentChange).toBeCloseTo(0);
    });
});
