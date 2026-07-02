// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { generatePersona, buildPersonaSignals } from "@/lib/persona/generator";
import * as schema from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodCatId: string;
let rentCatId: string;
let giftCatId: string;
let investCatId: string;
let entertainCatId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodCatId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentCatId = await seedTestCategory(testDb.db, userId, { name: "Rent" });
    giftCatId = await seedTestCategory(testDb.db, userId, { name: "Gift" });
    investCatId = await seedTestCategory(testDb.db, userId, {
        name: "Investments",
        type: "investment",
    });
    entertainCatId = await seedTestCategory(testDb.db, userId, { name: "Entertainment" });
});

afterAll(async () => await testDb.cleanup());

/** Helper to seed expenses for a month */
async function seedExpenses(
    year: number,
    month: number,
    entries: { categoryId: string; amount: number }[]
) {
    for (const entry of entries) {
        await testDb.db.insert(schema.expenses).values({
            id: uuid(),
            userId,
            categoryId: entry.categoryId,
            year,
            month,
            amount: entry.amount,
            source: "manual",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}

/** Helper to seed income */
async function seedIncome(year: number, month: number, amount: number) {
    await testDb.db.insert(schema.monthlyIncome).values({
        id: uuid(),
        userId,
        year,
        month,
        amount,
        source: "salary",
        createdAt: new Date(),
    });
}

/** Helper to seed a budget */
async function seedBudget(categoryId: string, limit: number, from: string = "2025-01") {
    await testDb.db.insert(schema.budgets).values({
        id: uuid(),
        userId,
        categoryId,
        monthlyLimit: limit,
        effectiveFrom: from,
        createdAt: new Date(),
    });
}

describe("buildPersonaSignals", () => {
    it("builds signals from DB data", async () => {
        // Seed June 2025 data
        await seedIncome(2025, 6, 100000);
        await seedExpenses(2025, 6, [
            { categoryId: foodCatId, amount: 10000 },
            { categoryId: rentCatId, amount: 15000 },
            { categoryId: investCatId, amount: 20000 },
        ]);
        // Seed May 2025 for MoM comparison
        await seedIncome(2025, 5, 100000);
        await seedExpenses(2025, 5, [
            { categoryId: foodCatId, amount: 12000 },
            { categoryId: rentCatId, amount: 15000 },
        ]);
        // Budget for food
        await seedBudget(foodCatId, 12000);

        const signals = await buildPersonaSignals(testDb.db, userId, 2025, 6);

        expect(signals.year).toBe(2025);
        expect(signals.month).toBe(6);
        expect(signals.totalSpend).toBe(45000);
        expect(signals.totalIncome).toBe(100000);
        expect(signals.savingsRate).toBeCloseTo(55, 0);
        expect(signals.momChangePct).toBeDefined();
        expect(typeof signals.overBudgetCount).toBe("number");
        expect(typeof signals.underBudgetCount).toBe("number");
    });

    it("handles month with no previous data (null MoM)", async () => {
        // January 2024 — no December 2023 data exists
        await seedIncome(2024, 1, 80000);
        await seedExpenses(2024, 1, [{ categoryId: foodCatId, amount: 5000 }]);

        const signals = await buildPersonaSignals(testDb.db, userId, 2024, 1);

        // MoM should still compute (prev month had 0 spend)
        expect(signals.totalSpend).toBe(5000);
        expect(signals.totalIncome).toBe(80000);
    });

    it("detects new categories vs previous month", async () => {
        // March 2024 has Gift, Feb 2024 does not
        await seedIncome(2024, 2, 90000);
        await seedExpenses(2024, 2, [{ categoryId: foodCatId, amount: 8000 }]);

        await seedIncome(2024, 3, 90000);
        await seedExpenses(2024, 3, [
            { categoryId: foodCatId, amount: 8000 },
            { categoryId: giftCatId, amount: 3000 },
        ]);

        const signals = await buildPersonaSignals(testDb.db, userId, 2024, 3);
        expect(signals.newCategories).toContain("Gift");
    });
});

describe("generatePersona", () => {
    it("returns a full PersonaResult", async () => {
        const result = await generatePersona(testDb.db, userId, 2025, 6);

        expect(result.year).toBe(2025);
        expect(result.month).toBe(6);
        expect(result.persona.name).toBeTruthy();
        expect(result.persona.emoji).toBeTruthy();
        expect(result.persona.description).toBeTruthy();
        expect(result.metrics.totalSpend).toBeGreaterThan(0);
        expect(result.metrics.totalIncome).toBeGreaterThan(0);
        expect(Array.isArray(result.insights)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("assigns Saver/Overachiever for high savings rate", async () => {
        // June 2025: 45000 spend on 100000 income = 55% savings, budgets met
        const result = await generatePersona(testDb.db, userId, 2025, 6);
        expect(["The Saver", "The Overachiever"]).toContain(result.persona.name);
    });

    it("returns zero-state gracefully when no data exists", async () => {
        const result = await generatePersona(testDb.db, userId, 2030, 1);

        expect(result.persona.name).toBeTruthy();
        expect(result.metrics.totalSpend).toBe(0);
    });
});
