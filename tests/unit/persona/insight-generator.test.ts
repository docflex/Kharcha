// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateInsights } from "@/lib/persona/insights";
import type { PersonaSignals } from "@/lib/persona/types";

function makeSignals(overrides: Partial<PersonaSignals> = {}): PersonaSignals {
    return {
        year: 2025,
        month: 6,
        totalSpend: 50000,
        totalIncome: 100000,
        savingsRate: 50,
        momChangePct: 0,
        overBudgetCount: 0,
        underBudgetCount: 0,
        onTrackCount: 0,
        totalBudgetedCategories: 0,
        newCategories: [],
        droppedCategories: [],
        categoryMoMChanges: [],
        budgetStatuses: [],
        trends: [],
        ...overrides,
    };
}

describe("generateInsights", () => {
    it("returns at most 5 insights", () => {
        const signals = makeSignals({
            budgetStatuses: [
                {
                    categoryId: "1",
                    categoryName: "Food",
                    actual: 15000,
                    budgetLimit: 10000,
                    percentUsed: 150,
                    status: "over",
                },
                {
                    categoryId: "2",
                    categoryName: "Rent",
                    actual: 20000,
                    budgetLimit: 15000,
                    percentUsed: 133,
                    status: "over",
                },
                {
                    categoryId: "3",
                    categoryName: "Gym",
                    actual: 3000,
                    budgetLimit: 2000,
                    percentUsed: 150,
                    status: "over",
                },
            ],
            overBudgetCount: 3,
            categoryMoMChanges: [
                {
                    categoryId: "1",
                    categoryName: "Food",
                    currentAmount: 15000,
                    previousAmount: 8000,
                    percentChange: 87.5,
                },
                {
                    categoryId: "4",
                    categoryName: "Entertainment",
                    currentAmount: 5000,
                    previousAmount: 2000,
                    percentChange: 150,
                },
            ],
            newCategories: ["Flight", "Hotel"],
            savingsRate: 35,
        });

        const insights = generateInsights(signals);
        expect(insights.length).toBeLessThanOrEqual(5);
        expect(insights.length).toBeGreaterThanOrEqual(3);
    });

    it("generates over-budget insight", () => {
        const insights = generateInsights(
            makeSignals({
                budgetStatuses: [
                    {
                        categoryId: "1",
                        categoryName: "Food",
                        actual: 15000,
                        budgetLimit: 10000,
                        percentUsed: 150,
                        status: "over",
                    },
                ],
                overBudgetCount: 1,
            })
        );

        const overBudget = insights.find((i) => i.type === "over_budget");
        expect(overBudget).toBeDefined();
        expect(overBudget!.categoryName).toBe("Food");
        expect(overBudget!.sentiment).toBe("negative");
        expect(overBudget!.message).toContain("exceeded budget");
    });

    it("generates spending increase insight", () => {
        const insights = generateInsights(
            makeSignals({
                categoryMoMChanges: [
                    {
                        categoryId: "1",
                        categoryName: "Rapido",
                        currentAmount: 3000,
                        previousAmount: 1500,
                        percentChange: 100,
                    },
                ],
            })
        );

        const increase = insights.find((i) => i.type === "spending_increase");
        expect(increase).toBeDefined();
        expect(increase!.categoryName).toBe("Rapido");
        expect(increase!.sentiment).toBe("negative");
        expect(increase!.message).toContain("up");
    });

    it("generates spending decrease insight", () => {
        const insights = generateInsights(
            makeSignals({
                categoryMoMChanges: [
                    {
                        categoryId: "1",
                        categoryName: "Food",
                        currentAmount: 5000,
                        previousAmount: 10000,
                        percentChange: -50,
                    },
                ],
            })
        );

        const decrease = insights.find((i) => i.type === "spending_decrease");
        expect(decrease).toBeDefined();
        expect(decrease!.categoryName).toBe("Food");
        expect(decrease!.sentiment).toBe("positive");
        expect(decrease!.message).toContain("dropped");
    });

    it("generates under-budget insight", () => {
        const insights = generateInsights(
            makeSignals({
                budgetStatuses: [
                    {
                        categoryId: "1",
                        categoryName: "Groceries",
                        actual: 3000,
                        budgetLimit: 10000,
                        percentUsed: 30,
                        status: "under",
                    },
                ],
            })
        );

        const under = insights.find((i) => i.type === "under_budget");
        expect(under).toBeDefined();
        expect(under!.categoryName).toBe("Groceries");
        expect(under!.sentiment).toBe("positive");
    });

    it("generates new category insight", () => {
        const insights = generateInsights(
            makeSignals({
                newCategories: ["Flight", "Hotel"],
            })
        );

        const newCat = insights.find((i) => i.type === "new_category");
        expect(newCat).toBeDefined();
        expect(newCat!.message).toContain("Flight");
        expect(newCat!.sentiment).toBe("neutral");
    });

    it("generates positive savings insight when rate > 30%", () => {
        const insights = generateInsights(makeSignals({ savingsRate: 45 }));
        const savings = insights.find((i) => i.type === "savings_trend");
        expect(savings).toBeDefined();
        expect(savings!.sentiment).toBe("positive");
        expect(savings!.message).toContain("45%");
    });

    it("generates negative savings insight when rate < 0", () => {
        const insights = generateInsights(
            makeSignals({
                savingsRate: -10,
                totalIncome: 100000,
                totalSpend: 110000,
            })
        );
        const savings = insights.find((i) => i.type === "savings_trend");
        expect(savings).toBeDefined();
        expect(savings!.sentiment).toBe("negative");
        expect(savings!.message).toContain("exceeded income");
    });

    it("returns empty array when no signals trigger insights", () => {
        const insights = generateInsights(makeSignals({ savingsRate: 20, totalIncome: 0 }));
        expect(Array.isArray(insights)).toBe(true);
    });

    it("does not generate savings insight when income is zero", () => {
        const insights = generateInsights(makeSignals({ totalIncome: 0, savingsRate: 0 }));
        const savings = insights.find((i) => i.type === "savings_trend");
        expect(savings).toBeUndefined();
    });
});
