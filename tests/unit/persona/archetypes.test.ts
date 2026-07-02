// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PERSONA_ARCHETYPES, matchPersona } from "@/lib/persona/archetypes";
import type { PersonaSignals } from "@/lib/persona/types";

/** Helper to create a base signals object with sensible defaults */
function makeSignals(overrides: Partial<PersonaSignals> = {}): PersonaSignals {
    return {
        year: 2025,
        month: 6,
        totalSpend: 50000,
        totalIncome: 100000,
        savingsRate: 50,
        momChangePct: 0,
        overBudgetCount: 0,
        underBudgetCount: 3,
        onTrackCount: 2,
        totalBudgetedCategories: 5,
        newCategories: [],
        droppedCategories: [],
        categoryMoMChanges: [],
        budgetStatuses: [],
        trends: [],
        ...overrides,
    };
}

describe("PERSONA_ARCHETYPES", () => {
    it("contains exactly 9 archetypes", () => {
        expect(PERSONA_ARCHETYPES).toHaveLength(9);
    });

    it("has unique names", () => {
        const names = PERSONA_ARCHETYPES.map((a) => a.name);
        expect(new Set(names).size).toBe(9);
    });

    it("has unique priorities", () => {
        const priorities = PERSONA_ARCHETYPES.map((a) => a.priority);
        expect(new Set(priorities).size).toBe(9);
    });

    it("each archetype has emoji and description", () => {
        for (const a of PERSONA_ARCHETYPES) {
            expect(a.emoji).toBeTruthy();
            expect(a.description).toBeTruthy();
            expect(a.description.length).toBeGreaterThan(10);
        }
    });
});

describe("matchPersona", () => {
    it("returns The Red Flagger when savings rate is negative", () => {
        const result = matchPersona(makeSignals({ savingsRate: -10, totalSpend: 110000 }));
        expect(result.name).toBe("The Red Flagger");
    });

    it("returns The Overachiever when spend < 50% income and all budgets met", () => {
        const result = matchPersona(
            makeSignals({
                totalSpend: 40000,
                totalIncome: 100000,
                savingsRate: 60,
                overBudgetCount: 0,
                totalBudgetedCategories: 5,
            })
        );
        expect(result.name).toBe("The Overachiever");
    });

    it("Overachiever requires budgeted categories to exist", () => {
        const result = matchPersona(
            makeSignals({
                totalSpend: 40000,
                totalIncome: 100000,
                savingsRate: 60,
                overBudgetCount: 0,
                totalBudgetedCategories: 0,
            })
        );
        // Should fall through to Saver (savingsRate > 40), not Overachiever
        expect(result.name).toBe("The Saver");
    });

    it("returns The Saver when savings > 40% and most categories under budget", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 45,
                totalSpend: 55000,
                totalIncome: 100000,
                underBudgetCount: 4,
                totalBudgetedCategories: 5,
                overBudgetCount: 1,
            })
        );
        expect(result.name).toBe("The Saver");
    });

    it("Saver still matches with no budgets when savings > 40%", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 45,
                totalBudgetedCategories: 0,
                underBudgetCount: 0,
            })
        );
        expect(result.name).toBe("The Saver");
    });

    it("returns The Optimizer when savings 25-40% and spending trending down", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 30,
                momChangePct: -8,
                overBudgetCount: 1,
            })
        );
        expect(result.name).toBe("The Optimizer");
    });

    it("returns The Generous when Gift/Entertainment > 15% of spend", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 20,
                momChangePct: 3,
                categoryMoMChanges: [
                    {
                        categoryId: "g1",
                        categoryName: "Gift",
                        currentAmount: 5000,
                        previousAmount: 2000,
                        percentChange: 150,
                    },
                    {
                        categoryId: "e1",
                        categoryName: "Entertainment",
                        currentAmount: 6000,
                        previousAmount: 4000,
                        percentChange: 50,
                    },
                ],
                totalSpend: 60000,
                totalIncome: 75000,
            })
        );
        expect(result.name).toBe("The Generous");
    });

    it("returns The Explorer when 2+ new categories appeared", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 20,
                momChangePct: 10,
                newCategories: ["Flight", "Hotel"],
            })
        );
        expect(result.name).toBe("The Explorer");
    });

    it("Explorer does not match if MoM increase > 25%", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 20,
                momChangePct: 30,
                newCategories: ["Flight", "Hotel"],
                overBudgetCount: 1,
            })
        );
        // Should fall through to Stretcher (momChangePct > 15, overBudgetCount > 0)
        expect(result.name).toBe("The Stretcher");
    });

    it("returns The Steady when MoM change < 5%", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 20,
                momChangePct: 2,
            })
        );
        expect(result.name).toBe("The Steady");
    });

    it("returns The Stretcher when MoM > 15% and over budget", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 15,
                momChangePct: 20,
                overBudgetCount: 2,
            })
        );
        expect(result.name).toBe("The Stretcher");
    });

    it("returns The Splurger when savings < 10% and 2+ over budget", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: 5,
                momChangePct: 8,
                overBudgetCount: 3,
                totalSpend: 95000,
                totalIncome: 100000,
            })
        );
        expect(result.name).toBe("The Splurger");
    });

    it("Red Flagger takes priority over Splurger", () => {
        const result = matchPersona(
            makeSignals({
                savingsRate: -5,
                overBudgetCount: 5,
            })
        );
        expect(result.name).toBe("The Red Flagger");
    });

    it("Overachiever takes priority over Saver", () => {
        const result = matchPersona(
            makeSignals({
                totalSpend: 30000,
                totalIncome: 100000,
                savingsRate: 70,
                overBudgetCount: 0,
                underBudgetCount: 5,
                totalBudgetedCategories: 5,
            })
        );
        expect(result.name).toBe("The Overachiever");
    });

    it("falls back to The Steady when nothing matches", () => {
        // momChangePct is null AND savingsRate 15 — no specific match
        const result = matchPersona(
            makeSignals({
                savingsRate: 15,
                momChangePct: null,
                overBudgetCount: 0,
                newCategories: [],
            })
        );
        expect(result.name).toBe("The Steady");
    });
});
