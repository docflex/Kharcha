import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { createBudget } from "@/lib/services/budget-service";
import { getMonthSummary, getMoMComparison } from "@/lib/analytics/mom";
import { calculateSavings } from "@/lib/analytics/savings";
import { getBudgetOverview } from "@/lib/analytics/budget";
import { getCategoryTrends, getTopCategories } from "@/lib/analytics/trends";

/**
 * Integration tests that exercise the full analytics flow:
 * seed expenses + budgets → run analytics → verify correctness.
 */
describe("Analytics Flow — Full Integration", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let catFood: string;
    let catRent: string;
    let catInvest: string;
    let catElec: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        catFood = await seedTestCategory(db, userId, { name: "Food" });
        catRent = await seedTestCategory(db, userId, { name: "Rent" });
        catElec = await seedTestCategory(db, userId, { name: "Electricity" });
        catInvest = await seedTestCategory(db, userId, {
            name: "Investments",
            type: "investment",
        });
    });

    afterEach(async () => await cleanup());

    describe("month summary with real expenses", () => {
        it("correctly sums expenses and investments", async () => {
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });
            await createExpense(db, userId, {
                categoryId: catRent,
                year: 2026,
                month: 1,
                amount: 15000,
                source: "manual",
            });
            await createExpense(db, userId, {
                categoryId: catInvest,
                year: 2026,
                month: 1,
                amount: 10000,
                source: "manual",
            });

            const summary = await getMonthSummary(db, userId, 2026, 1);
            expect(summary.totalSpend).toBe(30000);
            expect(summary.totalExpenses).toBe(20000);
            expect(summary.totalInvestments).toBe(10000);
            expect(summary.categories).toHaveLength(3);
        });

        it("returns zeros for month with no data", async () => {
            const summary = await getMonthSummary(db, userId, 2026, 6);
            expect(summary.totalSpend).toBe(0);
            expect(summary.totalExpenses).toBe(0);
            expect(summary.totalInvestments).toBe(0);
            expect(summary.categories).toHaveLength(0);
        });
    });

    describe("MoM comparison", () => {
        it("correctly computes MoM changes", async () => {
            // January: Food=5000
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });
            // February: Food=7000
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 2,
                amount: 7000,
                source: "manual",
            });

            const mom = await getMoMComparison(db, userId, 2026, 2);
            expect(mom.totalCurrentSpend).toBe(7000);
            expect(mom.totalPreviousSpend).toBe(5000);
            expect(mom.totalPercentChange).toBeCloseTo(40);

            const foodChange = mom.categories.find(
                (c: { categoryName: string }) => c.categoryName === "Food"
            );
            expect(foodChange).toBeDefined();
            expect(foodChange!.absoluteChange).toBe(2000);
        });

        it("handles MoM when previous month has no data", async () => {
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 3,
                amount: 5000,
                source: "manual",
            });

            const mom = await getMoMComparison(db, userId, 2026, 3);
            expect(mom.totalCurrentSpend).toBe(5000);
            expect(mom.totalPreviousSpend).toBe(0);
            expect(mom.totalPercentChange).toBeNull();
        });

        it("handles year boundary (Jan vs Dec)", async () => {
            // Dec 2025
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2025,
                month: 12,
                amount: 3000,
                source: "manual",
            });
            // Jan 2026
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 4500,
                source: "manual",
            });

            const mom = await getMoMComparison(db, userId, 2026, 1);
            expect(mom.totalPreviousSpend).toBe(3000);
            expect(mom.totalCurrentSpend).toBe(4500);
            expect(mom.totalPercentChange).toBeCloseTo(50);
        });
    });

    describe("savings with real data", () => {
        it("computes savings with income entry", async () => {
            // Add income for the month
            await db.execute(
                sql`INSERT INTO monthly_income (id, user_id, year, month, amount, source, created_at)
                    VALUES ('inc1', ${userId}, 2026, 1, 100000, 'salary', ${new Date()})`
            );

            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 25000,
                source: "manual",
            });

            const savings = await calculateSavings(db, userId, 2026, 1);
            expect(savings.totalIncome).toBe(100000);
            expect(savings.totalSpend).toBe(25000);
            expect(savings.savings).toBe(75000);
            expect(savings.savingsRate).toBeCloseTo(75);
        });

        it("uses default income when no monthly entry", async () => {
            await db.execute(
                sql`UPDATE users SET default_monthly_income = 90000 WHERE id = ${userId}`
            );

            await createExpense(db, userId, {
                categoryId: catRent,
                year: 2026,
                month: 1,
                amount: 15000,
                source: "manual",
            });

            const savings = await calculateSavings(db, userId, 2026, 1);
            expect(savings.totalIncome).toBe(90000);
            expect(savings.totalSpend).toBe(15000);
            expect(savings.savings).toBe(75000);
        });

        it("returns zero savings when no income at all", async () => {
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });

            const savings = await calculateSavings(db, userId, 2026, 1);
            expect(savings.totalIncome).toBe(0);
            expect(savings.savings).toBe(-5000);
        });
    });

    describe("budget overview with real data", () => {
        it("identifies over-budget categories", async () => {
            await createBudget(db, userId, {
                categoryId: catFood,
                monthlyLimit: 3000,
                effectiveFrom: "2026-01",
            });

            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });

            const overview = await getBudgetOverview(db, userId, 2026, 1);
            expect(overview.overBudgetCount).toBe(1);
            expect(overview.statuses).toHaveLength(1);

            const foodStatus = overview.statuses[0];
            expect(foodStatus.status).toBe("over");
            expect(foodStatus.percentUsed).toBeCloseTo(166.67, 0);
        });

        it("identifies on-track categories (60-80% used)", async () => {
            await createBudget(db, userId, {
                categoryId: catRent,
                monthlyLimit: 20000,
                effectiveFrom: "2026-01",
            });

            await createExpense(db, userId, {
                categoryId: catRent,
                year: 2026,
                month: 1,
                amount: 15000,
                source: "manual",
            });

            const overview = await getBudgetOverview(db, userId, 2026, 1);
            // 15000/20000 = 75% → on-track
            expect(overview.onTrackCount).toBe(1);
            expect(overview.statuses[0].status).toBe("on-track");
        });

        it("identifies under-budget categories (<60% used)", async () => {
            await createBudget(db, userId, {
                categoryId: catRent,
                monthlyLimit: 20000,
                effectiveFrom: "2026-01",
            });

            await createExpense(db, userId, {
                categoryId: catRent,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });

            const overview = await getBudgetOverview(db, userId, 2026, 1);
            // 5000/20000 = 25% → under
            expect(overview.underBudgetCount).toBe(1);
            expect(overview.statuses[0].status).toBe("under");
        });

        it("handles categories with no spending against budget", async () => {
            await createBudget(db, userId, {
                categoryId: catElec,
                monthlyLimit: 2000,
                effectiveFrom: "2026-01",
            });

            const overview = await getBudgetOverview(db, userId, 2026, 1);
            expect(overview.statuses).toHaveLength(1);
            expect(overview.statuses[0].actual).toBe(0);
            expect(overview.statuses[0].status).toBe("under");
        });

        it("empty overview when no budgets set", async () => {
            const overview = await getBudgetOverview(db, userId, 2026, 1);
            expect(overview.statuses).toHaveLength(0);
            expect(overview.overBudgetCount).toBe(0);
        });
    });

    describe("trends with real data", () => {
        it("returns top categories sorted by amount", async () => {
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });
            await createExpense(db, userId, {
                categoryId: catRent,
                year: 2026,
                month: 1,
                amount: 15000,
                source: "manual",
            });
            await createExpense(db, userId, {
                categoryId: catElec,
                year: 2026,
                month: 1,
                amount: 2000,
                source: "manual",
            });

            const top = await getTopCategories(db, userId, 2026, 1, 2);
            expect(top).toHaveLength(2);
            expect(top[0].categoryName).toBe("Rent");
            expect(top[0].amount).toBe(15000);
            expect(top[1].categoryName).toBe("Food");
        });

        it("returns empty trends for empty range", async () => {
            const trends = await getCategoryTrends(db, userId, 2026, 1, 2026, 3);
            expect(trends).toHaveLength(0);
        });

        it("returns correct trend data points", async () => {
            // Jan, Feb, Mar with increasing food spending
            for (let m = 1; m <= 3; m++) {
                await createExpense(db, userId, {
                    categoryId: catFood,
                    year: 2026,
                    month: m,
                    amount: m * 1000,
                    source: "manual",
                });
            }

            const trends = await getCategoryTrends(db, userId, 2026, 1, 2026, 3);
            const food = trends.find((t: { categoryName: string }) => t.categoryName === "Food");
            expect(food).toBeDefined();
            expect(food!.dataPoints).toHaveLength(3);
            expect(food!.dataPoints[0].amount).toBe(1000);
            expect(food!.dataPoints[2].amount).toBe(3000);
        });
    });
});
