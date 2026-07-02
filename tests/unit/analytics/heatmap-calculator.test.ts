// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createExpense } from "@/lib/services/expense-service";
import { getCategoryHeatmap } from "@/lib/analytics/heatmap";

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

    // Seed 4 months of data: Jan-Apr 2026
    const months = [
        { month: 1, food: 8000, rent: 15000, invest: 50000 },
        { month: 2, food: 10000, rent: 15000, invest: 50000 },
        { month: 3, food: 12000, rent: 15000, invest: 60000 },
        { month: 4, food: 6000, rent: 15000, invest: 40000 },
    ];

    for (const m of months) {
        await createExpense(testDb.db, userId, {
            categoryId: foodId,
            year: 2026,
            month: m.month,
            amount: m.food,
        });
        await createExpense(testDb.db, userId, {
            categoryId: rentId,
            year: 2026,
            month: m.month,
            amount: m.rent,
        });
        await createExpense(testDb.db, userId, {
            categoryId: investId,
            year: 2026,
            month: m.month,
            amount: m.invest,
        });
    }
});

afterAll(async () => await testDb.cleanup());

describe("getCategoryHeatmap", () => {
    it("returns a grid with one row per category", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        expect(heatmap.categories.length).toBeGreaterThanOrEqual(3);
    });

    it("each category has 12 monthly cells", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        for (const cat of heatmap.categories) {
            expect(cat.months).toHaveLength(12);
        }
    });

    it("returns correct amounts for months with data", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        const food = heatmap.categories.find((c) => c.categoryName === "Food");
        expect(food).toBeDefined();
        expect(food!.months[0].amount).toBeCloseTo(8000); // Jan
        expect(food!.months[1].amount).toBeCloseTo(10000); // Feb
        expect(food!.months[2].amount).toBeCloseTo(12000); // Mar
        expect(food!.months[3].amount).toBeCloseTo(6000); // Apr
    });

    it("fills zero for months without data", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        const food = heatmap.categories.find((c) => c.categoryName === "Food");
        expect(food!.months[11].amount).toBe(0); // Dec — no data
    });

    it("computes intensity 0-1 based on max across the grid", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        // Max amount across entire grid should have intensity 1
        let maxIntensity = 0;
        let zeroIntensity = false;
        for (const cat of heatmap.categories) {
            for (const m of cat.months) {
                if (m.intensity > maxIntensity) maxIntensity = m.intensity;
                if (m.amount === 0 && m.intensity === 0) zeroIntensity = true;
            }
        }
        expect(maxIntensity).toBe(1);
        expect(zeroIntensity).toBe(true);
    });

    it("includes category type in each row", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        const invest = heatmap.categories.find((c) => c.categoryName === "Investments");
        expect(invest!.type).toBe("investment");
        const food = heatmap.categories.find((c) => c.categoryName === "Food");
        expect(food!.type).toBe("expense");
    });

    it("returns empty categories for a year with no data", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2020);
        expect(heatmap.categories).toHaveLength(0);
    });

    it("returns the year in the result", async () => {
        const heatmap = await getCategoryHeatmap(testDb.db, userId, 2026);
        expect(heatmap.year).toBe(2026);
    });
});
