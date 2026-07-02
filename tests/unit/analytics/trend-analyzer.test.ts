// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { getCategoryTrends, getTopCategories } from "@/lib/analytics/trends";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodId: string;
let rentId: string;
let gymId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentId = await seedTestCategory(testDb.db, userId, { name: "Rent" });
    gymId = await seedTestCategory(testDb.db, userId, { name: "Gym" });

    // 4 months of data: March → June 2026
    const months = [
        { month: 3, food: 8000, rent: 15000, gym: 1200 },
        { month: 4, food: 9000, rent: 15000, gym: 1400 },
        { month: 5, food: 11000, rent: 15000, gym: 1449 },
        { month: 6, food: 9824.8, rent: 15000, gym: 0 },
    ];

    for (const m of months) {
        if (m.food > 0) {
            await createExpense(testDb.db, userId, {
                categoryId: foodId,
                year: 2026,
                month: m.month,
                amount: m.food,
            });
        }
        await createExpense(testDb.db, userId, {
            categoryId: rentId,
            year: 2026,
            month: m.month,
            amount: m.rent,
        });
        if (m.gym > 0) {
            await createExpense(testDb.db, userId, {
                categoryId: gymId,
                year: 2026,
                month: m.month,
                amount: m.gym,
            });
        }
    }
});

afterAll(async () => await testDb.cleanup());

describe("getCategoryTrends", () => {
    it("returns trends for all categories in the range", async () => {
        const trends = await getCategoryTrends(testDb.db, userId, 2026, 3, 2026, 6);
        expect(trends.length).toBeGreaterThanOrEqual(3);
    });

    it("computes correct data points per category", async () => {
        const trends = await getCategoryTrends(testDb.db, userId, 2026, 3, 2026, 6);
        const food = trends.find((t) => t.categoryName === "Food");
        expect(food).toBeDefined();
        expect(food!.dataPoints).toHaveLength(4);
        expect(food!.dataPoints[0].amount).toBeCloseTo(8000);
        expect(food!.dataPoints[3].amount).toBeCloseTo(9824.8);
    });

    it("computes min/max/average correctly", async () => {
        const trends = await getCategoryTrends(testDb.db, userId, 2026, 3, 2026, 6);
        const food = trends.find((t) => t.categoryName === "Food");
        expect(food!.minAmount).toBeCloseTo(8000);
        expect(food!.maxAmount).toBeCloseTo(11000);
        // avg: (8000 + 9000 + 11000 + 9824.8) / 4 = 9456.2
        expect(food!.averageAmount).toBeCloseTo(9456.2);
    });

    it("detects stable trend for constant values", async () => {
        const trends = await getCategoryTrends(testDb.db, userId, 2026, 3, 2026, 6);
        const rent = trends.find((t) => t.categoryName === "Rent");
        expect(rent!.direction).toBe("stable");
    });

    it("fills zero for months where category has no spending", async () => {
        const trends = await getCategoryTrends(testDb.db, userId, 2026, 3, 2026, 6);
        const gym = trends.find((t) => t.categoryName === "Gym");
        expect(gym).toBeDefined();
        // Gym has data for months 3, 4, 5 but not 6
        const june = gym!.dataPoints.find((dp) => dp.month === 6);
        expect(june!.amount).toBe(0);
    });
});

describe("getTopCategories", () => {
    it("returns top N categories by amount for a month", async () => {
        const top = await getTopCategories(testDb.db, userId, 2026, 6, 2);
        expect(top).toHaveLength(2);
        expect(top[0].categoryName).toBe("Rent"); // 15000
        expect(top[1].categoryName).toBe("Food"); // 9824.80
    });

    it("defaults to top 10", async () => {
        const top = await getTopCategories(testDb.db, userId, 2026, 6);
        expect(top.length).toBeLessThanOrEqual(10);
        expect(top.length).toBeGreaterThan(0);
    });
});
