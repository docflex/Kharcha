// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { calculateSavings } from "@/lib/analytics/savings";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodId: string;
let rentId: string;
let investId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentId = await seedTestCategory(testDb.db, userId, { name: "Rent" });
    investId = await seedTestCategory(testDb.db, userId, {
        name: "Investments",
        type: "investment",
    });

    // Set monthly income for June 2026
    await testDb.db.insert(schema.monthlyIncome).values({
        id: uuid(),
        userId,
        year: 2026,
        month: 6,
        amount: 100000,
        source: "salary",
        createdAt: new Date(),
    });

    // Add a second income source for June 2026
    await testDb.db.insert(schema.monthlyIncome).values({
        id: uuid(),
        userId,
        year: 2026,
        month: 6,
        amount: 20000,
        source: "freelance",
        createdAt: new Date(),
    });

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
        amount: 50000,
    });

    // Set default monthly income on user (fallback when no monthly_income entry)
    await testDb.db
        .update(schema.users)
        .set({ defaultMonthlyIncome: 90000 })
        .where(eq(schema.users.id, userId));
});

afterAll(async () => await testDb.cleanup());

describe("calculateSavings", () => {
    it("computes savings from income entries", async () => {
        const result = await calculateSavings(testDb.db, userId, 2026, 6);
        expect(result.year).toBe(2026);
        expect(result.month).toBe(6);
        // Total income: 100000 + 20000 = 120000
        expect(result.totalIncome).toBeCloseTo(120000);
        // Total spend: 9824.80 + 15000 + 50000 = 74824.80
        expect(result.totalSpend).toBeCloseTo(74824.8);
        // Savings: 120000 - 74824.80 = 45175.20
        expect(result.savings).toBeCloseTo(45175.2);
        // Savings rate: 45175.20 / 120000 * 100 = ~37.65%
        expect(result.savingsRate).toBeCloseTo(37.65, 1);
    });

    it("falls back to default monthly income when no income entries exist", async () => {
        // No income entries for May 2026, but default income is 90000
        await createExpense(testDb.db, userId, {
            categoryId: foodId,
            year: 2026,
            month: 5,
            amount: 10000,
        });

        const result = await calculateSavings(testDb.db, userId, 2026, 5);
        expect(result.totalIncome).toBeCloseTo(90000);
        expect(result.totalSpend).toBeCloseTo(10000);
        expect(result.savings).toBeCloseTo(80000);
        expect(result.savingsRate).toBeCloseTo(88.89, 1);
    });

    it("returns zero income and negative savings when no income at all", async () => {
        // Create a separate user with no income
        const user2 = await seedTestUser(testDb.db, {
            email: "noincome@test.com",
            name: "No Income",
        });
        const catId = await seedTestCategory(testDb.db, user2, { name: "Food" });
        await createExpense(testDb.db, user2, {
            categoryId: catId,
            year: 2026,
            month: 4,
            amount: 5000,
        });

        const result = await calculateSavings(testDb.db, user2, 2026, 4);
        expect(result.totalIncome).toBe(0);
        expect(result.totalSpend).toBeCloseTo(5000);
        expect(result.savings).toBeCloseTo(-5000);
        expect(result.savingsRate).toBe(0); // cannot compute rate with 0 income
    });

    it("uses default income even for months with no expenses", async () => {
        // User has defaultMonthlyIncome=90000 set, so fallback applies
        const result = await calculateSavings(testDb.db, userId, 2020, 1);
        expect(result.totalIncome).toBeCloseTo(90000);
        expect(result.totalSpend).toBe(0);
        expect(result.savings).toBeCloseTo(90000);
        expect(result.savingsRate).toBeCloseTo(100);
    });
});
