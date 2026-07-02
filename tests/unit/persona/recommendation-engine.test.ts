// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateRecommendations } from "@/lib/persona/recommendations";
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

describe("generateRecommendations", () => {
    it("generates cut_back for categories > 120% budget", () => {
        const recs = generateRecommendations(
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
            })
        );

        const cutBack = recs.find((r) => r.type === "cut_back");
        expect(cutBack).toBeDefined();
        expect(cutBack!.categoryName).toBe("Food");
        expect(cutBack!.amount).toBe(5000);
        expect(cutBack!.message).toContain("Cut back");
    });

    it("generates room_to_spend for categories < 60% budget", () => {
        const recs = generateRecommendations(
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

        const room = recs.find((r) => r.type === "room_to_spend");
        expect(room).toBeDefined();
        expect(room!.categoryName).toBe("Groceries");
        expect(room!.amount).toBe(7000);
        expect(room!.message).toContain("Room to spend");
    });

    it("generates watch_out for 3+ consecutive months up", () => {
        const recs = generateRecommendations(
            makeSignals({
                trends: [
                    {
                        categoryId: "1",
                        categoryName: "Rapido",
                        direction: "up",
                        consecutiveMonthsUp: 3,
                        consecutiveMonthsDown: 0,
                    },
                ],
            })
        );

        const watchOut = recs.find((r) => r.type === "watch_out");
        expect(watchOut).toBeDefined();
        expect(watchOut!.categoryName).toBe("Rapido");
        expect(watchOut!.message).toContain("3 consecutive months");
    });

    it("does not generate watch_out for < 3 consecutive months", () => {
        const recs = generateRecommendations(
            makeSignals({
                trends: [
                    {
                        categoryId: "1",
                        categoryName: "Rapido",
                        direction: "up",
                        consecutiveMonthsUp: 2,
                        consecutiveMonthsDown: 0,
                    },
                ],
            })
        );

        const watchOut = recs.find((r) => r.type === "watch_out");
        expect(watchOut).toBeUndefined();
    });

    it("generates great_job for categories trending down", () => {
        const recs = generateRecommendations(
            makeSignals({
                trends: [
                    {
                        categoryId: "1",
                        categoryName: "Food",
                        direction: "down",
                        consecutiveMonthsUp: 0,
                        consecutiveMonthsDown: 2,
                    },
                ],
            })
        );

        const greatJob = recs.find((r) => r.type === "great_job");
        expect(greatJob).toBeDefined();
        expect(greatJob!.categoryName).toBe("Food");
        expect(greatJob!.message).toContain("Great job");
    });

    it("generates great_job for categories well under budget", () => {
        const recs = generateRecommendations(
            makeSignals({
                budgetStatuses: [
                    {
                        categoryId: "1",
                        categoryName: "Gym",
                        actual: 1500,
                        budgetLimit: 5000,
                        percentUsed: 30,
                        status: "under",
                    },
                ],
            })
        );

        const greatJob = recs.find((r) => r.type === "great_job" && r.categoryName === "Gym");
        expect(greatJob).toBeDefined();
    });

    it("returns empty array when no conditions met", () => {
        const recs = generateRecommendations(makeSignals());
        expect(recs).toEqual([]);
    });

    it("sorts cut_back by severity (highest overrun first)", () => {
        const recs = generateRecommendations(
            makeSignals({
                budgetStatuses: [
                    {
                        categoryId: "1",
                        categoryName: "Food",
                        actual: 13000,
                        budgetLimit: 10000,
                        percentUsed: 130,
                        status: "over",
                    },
                    {
                        categoryId: "2",
                        categoryName: "Entertainment",
                        actual: 20000,
                        budgetLimit: 10000,
                        percentUsed: 200,
                        status: "over",
                    },
                ],
            })
        );

        const cutBacks = recs.filter((r) => r.type === "cut_back");
        expect(cutBacks.length).toBe(2);
        // Entertainment (200%) should come before Food (130%)
        expect(cutBacks[0].categoryName).toBe("Entertainment");
        expect(cutBacks[1].categoryName).toBe("Food");
    });

    describe("fallback recommendations (no budgets)", () => {
        it("generates overspend warning when savingsRate < 0 and no budgets", () => {
            const recs = generateRecommendations(
                makeSignals({
                    totalSpend: 120000,
                    totalIncome: 100000,
                    savingsRate: -20,
                    budgetStatuses: [],
                    categoryMoMChanges: [
                        {
                            categoryId: "1",
                            categoryName: "Rent",
                            currentAmount: 50000,
                            previousAmount: 50000,
                            percentChange: 0,
                        },
                        {
                            categoryId: "2",
                            categoryName: "Food",
                            currentAmount: 40000,
                            previousAmount: 35000,
                            percentChange: 14,
                        },
                        {
                            categoryId: "3",
                            categoryName: "Transport",
                            currentAmount: 30000,
                            previousAmount: 25000,
                            percentChange: 20,
                        },
                    ],
                })
            );

            const overspend = recs.find(
                (r) => r.type === "cut_back" && r.message.includes("exceeded income")
            );
            expect(overspend).toBeDefined();
            expect(overspend!.amount).toBe(20000);
            expect(overspend!.message).toContain("Rent");
            expect(overspend!.message).toContain("Food");
            expect(overspend!.message).toContain("Transport");
        });

        it("generates watch_out for MoM spikes > 20% when no budgets", () => {
            const recs = generateRecommendations(
                makeSignals({
                    budgetStatuses: [],
                    categoryMoMChanges: [
                        {
                            categoryId: "1",
                            categoryName: "Food",
                            currentAmount: 15000,
                            previousAmount: 10000,
                            percentChange: 50,
                        },
                    ],
                })
            );

            const watchOut = recs.find((r) => r.type === "watch_out" && r.categoryName === "Food");
            expect(watchOut).toBeDefined();
            expect(watchOut!.message).toContain("jumped 50%");
        });

        it("generates budget setup suggestion when spend > 90% of income with no budgets", () => {
            const recs = generateRecommendations(
                makeSignals({
                    totalSpend: 95000,
                    totalIncome: 100000,
                    savingsRate: 5,
                    budgetStatuses: [],
                    totalBudgetedCategories: 0,
                })
            );

            const setup = recs.find(
                (r) => r.type === "watch_out" && r.message.includes("budget targets")
            );
            expect(setup).toBeDefined();
            expect(setup!.message).toContain("95%");
        });

        it("does not generate fallback recs when budgets exist", () => {
            const recs = generateRecommendations(
                makeSignals({
                    totalSpend: 95000,
                    totalIncome: 100000,
                    savingsRate: 5,
                    budgetStatuses: [
                        {
                            categoryId: "1",
                            categoryName: "Food",
                            actual: 8000,
                            budgetLimit: 10000,
                            percentUsed: 80,
                            status: "on-track",
                        },
                    ],
                    totalBudgetedCategories: 1,
                    categoryMoMChanges: [
                        {
                            categoryId: "1",
                            categoryName: "Food",
                            currentAmount: 15000,
                            previousAmount: 10000,
                            percentChange: 50,
                        },
                    ],
                })
            );

            const fallbackWatch = recs.find(
                (r) => r.type === "watch_out" && r.message.includes("jumped")
            );
            expect(fallbackWatch).toBeUndefined();
        });

        it("does not generate overspend when savingsRate is positive", () => {
            const recs = generateRecommendations(
                makeSignals({
                    totalSpend: 50000,
                    totalIncome: 100000,
                    savingsRate: 50,
                    budgetStatuses: [],
                })
            );

            const overspend = recs.find(
                (r) => r.type === "cut_back" && r.message.includes("exceeded income")
            );
            expect(overspend).toBeUndefined();
        });

        it("does not generate budget setup when spend < 90% of income", () => {
            const recs = generateRecommendations(
                makeSignals({
                    totalSpend: 80000,
                    totalIncome: 100000,
                    savingsRate: 20,
                    budgetStatuses: [],
                    totalBudgetedCategories: 0,
                })
            );

            const setup = recs.find(
                (r) => r.type === "watch_out" && r.message.includes("budget targets")
            );
            expect(setup).toBeUndefined();
        });

        it("limits MoM spike watch_out to 2 categories", () => {
            const recs = generateRecommendations(
                makeSignals({
                    budgetStatuses: [],
                    categoryMoMChanges: [
                        {
                            categoryId: "1",
                            categoryName: "Food",
                            currentAmount: 15000,
                            previousAmount: 10000,
                            percentChange: 50,
                        },
                        {
                            categoryId: "2",
                            categoryName: "Rent",
                            currentAmount: 60000,
                            previousAmount: 40000,
                            percentChange: 50,
                        },
                        {
                            categoryId: "3",
                            categoryName: "Transport",
                            currentAmount: 9000,
                            previousAmount: 5000,
                            percentChange: 80,
                        },
                    ],
                })
            );

            const watchOuts = recs.filter(
                (r) => r.type === "watch_out" && r.message.includes("jumped")
            );
            expect(watchOuts.length).toBeLessThanOrEqual(2);
        });

        it("does not generate overspend when totalIncome is 0", () => {
            const recs = generateRecommendations(
                makeSignals({
                    totalSpend: 50000,
                    totalIncome: 0,
                    savingsRate: -100,
                    budgetStatuses: [],
                })
            );

            const overspend = recs.find(
                (r) => r.type === "cut_back" && r.message.includes("exceeded income")
            );
            expect(overspend).toBeUndefined();
        });
    });
});
