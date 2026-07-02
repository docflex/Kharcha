// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { createBudget } from "@/lib/services/budget-service";
import { getCategoryDeepDive } from "@/lib/analytics/category-deepdive";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let catId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    catId = await seedTestCategory(testDb.db, userId, { name: "Food" });
});

afterAll(async () => await testDb.cleanup());

describe("getCategoryDeepDive", () => {
    it("returns null for non-existent category", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, "non-existent-id");
        expect(result).toBeNull();
    });

    it("returns null for another user's category", async () => {
        const otherUser = await seedTestUser(testDb.db, { email: "other@test.com" });
        const otherCat = await seedTestCategory(testDb.db, otherUser, { name: "OtherFood" });
        const result = await getCategoryDeepDive(testDb.db, userId, otherCat);
        expect(result).toBeNull();
    });

    it("returns empty dataPoints for category with no expenses", async () => {
        const emptyCat = await seedTestCategory(testDb.db, userId, { name: "Empty" });
        const result = await getCategoryDeepDive(testDb.db, userId, emptyCat);
        expect(result).not.toBeNull();
        expect(result!.dataPoints).toHaveLength(0);
        expect(result!.stats.totalMonths).toBe(0);
        expect(result!.stats.average).toBe(0);
    });

    it("returns correct stats for category with expenses", async () => {
        await createExpense(testDb.db, userId, {
            categoryId: catId,
            year: 2025,
            month: 1,
            amount: 1000,
            source: "manual",
        });
        await createExpense(testDb.db, userId, {
            categoryId: catId,
            year: 2025,
            month: 2,
            amount: 3000,
            source: "manual",
        });

        const result = await getCategoryDeepDive(testDb.db, userId, catId);
        expect(result).not.toBeNull();
        expect(result!.categoryName).toBe("Food");
        expect(result!.dataPoints).toHaveLength(2);
        expect(result!.stats.totalMonths).toBe(2);
        expect(result!.stats.min).toBe(1000);
        expect(result!.stats.max).toBe(3000);
        expect(result!.stats.average).toBe(2000);
    });

    it("sorts data points chronologically", async () => {
        const result = await getCategoryDeepDive(testDb.db, userId, catId);
        expect(result).not.toBeNull();
        const dp = result!.dataPoints;
        for (let i = 0; i < dp.length - 1; i++) {
            const a = dp[i].year * 100 + dp[i].month;
            const b = dp[i + 1].year * 100 + dp[i + 1].month;
            expect(a).toBeLessThan(b);
        }
    });

    it("includes budget status when budget exists", async () => {
        await createBudget(testDb.db, userId, {
            categoryId: catId,
            monthlyLimit: 2000,
            effectiveFrom: "2025-01",
        });

        const result = await getCategoryDeepDive(testDb.db, userId, catId);
        expect(result).not.toBeNull();
        expect(result!.budgetLimit).toBe(2000);

        // month 1: 1000/2000 = 50% → "under"
        const jan = result!.dataPoints.find((d) => d.month === 1);
        expect(jan?.budgetStatus).toBe("under");

        // month 2: 3000/2000 = 150% → "over"
        const feb = result!.dataPoints.find((d) => d.month === 2);
        expect(feb?.budgetStatus).toBe("over");
    });

    it("detects anomalies (>1.5 stddev from mean)", async () => {
        // Add several similar months plus one extreme outlier to create clear anomaly
        for (let m = 4; m <= 8; m++) {
            await createExpense(testDb.db, userId, {
                categoryId: catId,
                year: 2025,
                month: m,
                amount: 2000,
                source: "manual",
            });
        }
        // Extreme outlier
        await createExpense(testDb.db, userId, {
            categoryId: catId,
            year: 2025,
            month: 9,
            amount: 50000,
            source: "manual",
        });

        const result = await getCategoryDeepDive(testDb.db, userId, catId);
        expect(result).not.toBeNull();
        const outlier = result!.dataPoints.find((d) => d.month === 9);
        expect(outlier?.isAnomaly).toBe(true);
    });
});
