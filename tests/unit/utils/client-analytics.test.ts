// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeAnalytics, computeSparkline } from "@/lib/utils/client-analytics";
import type { Snapshot } from "@/hooks/use-snapshot";

function makeSnapshot(overrides?: Partial<Snapshot>): Snapshot {
    return {
        year: 2026,
        version: 1,
        expenses: [],
        income: [],
        categories: [],
        budgets: [],
        ...overrides,
    };
}

describe("computeAnalytics", () => {
    it("returns zeros for empty snapshot", () => {
        const result = computeAnalytics(makeSnapshot(), 6);
        expect(result.summary.totalSpend).toBe(0);
        expect(result.summary.totalExpenses).toBe(0);
        expect(result.summary.totalInvestments).toBe(0);
        expect(result.savings.totalIncome).toBe(0);
        expect(result.savings.savings).toBe(0);
        expect(result.budgetOverview.statuses).toEqual([]);
    });

    it("computes month summary correctly", () => {
        const snap = makeSnapshot({
            categories: [
                { id: "c1", name: "Food", icon: null, color: null, type: "expense" },
                { id: "c2", name: "SIP", icon: null, color: null, type: "investment" },
            ],
            expenses: [
                {
                    id: "e1",
                    categoryId: "c1",
                    year: 2026,
                    month: 6,
                    amount: 5000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e2",
                    categoryId: "c1",
                    year: 2026,
                    month: 6,
                    amount: 3000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e3",
                    categoryId: "c2",
                    year: 2026,
                    month: 6,
                    amount: 10000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e4",
                    categoryId: "c1",
                    year: 2026,
                    month: 5,
                    amount: 4000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
            ],
        });

        const result = computeAnalytics(snap, 6);
        expect(result.summary.totalExpenses).toBe(8000);
        expect(result.summary.totalInvestments).toBe(10000);
        expect(result.summary.totalSpend).toBe(18000);
        expect(result.summary.categories).toHaveLength(2);
    });

    it("computes MoM comparison", () => {
        const snap = makeSnapshot({
            categories: [{ id: "c1", name: "Food", icon: null, color: null, type: "expense" }],
            expenses: [
                {
                    id: "e1",
                    categoryId: "c1",
                    year: 2026,
                    month: 6,
                    amount: 6000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e2",
                    categoryId: "c1",
                    year: 2026,
                    month: 5,
                    amount: 4000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
            ],
        });

        const result = computeAnalytics(snap, 6);
        expect(result.mom.totalCurrentSpend).toBe(6000);
        expect(result.mom.totalPreviousSpend).toBe(4000);
        expect(result.mom.totalPercentChange).toBe(50);
        expect(result.mom.categories[0].absoluteChange).toBe(2000);
    });

    it("computes savings correctly", () => {
        const snap = makeSnapshot({
            categories: [{ id: "c1", name: "Food", icon: null, color: null, type: "expense" }],
            expenses: [
                {
                    id: "e1",
                    categoryId: "c1",
                    year: 2026,
                    month: 6,
                    amount: 30000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
            ],
            income: [
                {
                    id: "i1",
                    year: 2026,
                    month: 6,
                    amount: 100000,
                    source: "salary",
                    createdAt: "2026-06-01",
                },
            ],
        });

        const result = computeAnalytics(snap, 6);
        expect(result.savings.totalIncome).toBe(100000);
        expect(result.savings.totalSpend).toBe(30000);
        expect(result.savings.savings).toBe(70000);
        expect(result.savings.savingsRate).toBe(70);
    });

    it("computes budget overview", () => {
        const snap = makeSnapshot({
            categories: [
                { id: "c1", name: "Food", icon: null, color: null, type: "expense" },
                { id: "c2", name: "Rent", icon: null, color: null, type: "expense" },
            ],
            expenses: [
                {
                    id: "e1",
                    categoryId: "c1",
                    year: 2026,
                    month: 6,
                    amount: 12000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e2",
                    categoryId: "c2",
                    year: 2026,
                    month: 6,
                    amount: 45000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
            ],
            budgets: [
                {
                    id: "b1",
                    categoryId: "c1",
                    monthlyLimit: 10000,
                    effectiveFrom: "2026-01",
                    effectiveUntil: null,
                },
                {
                    id: "b2",
                    categoryId: "c2",
                    monthlyLimit: 50000,
                    effectiveFrom: "2026-01",
                    effectiveUntil: null,
                },
            ],
        });

        const result = computeAnalytics(snap, 6);
        expect(result.budgetOverview.statuses).toHaveLength(2);
        expect(result.budgetOverview.overBudgetCount).toBe(1); // Food over
        expect(result.budgetOverview.statuses.find((s) => s.categoryName === "Food")?.status).toBe(
            "over"
        );
        expect(result.budgetOverview.statuses.find((s) => s.categoryName === "Rent")?.status).toBe(
            "warning"
        ); // 90%
    });

    it("returns top 5 categories sorted by amount", () => {
        const cats = Array.from({ length: 7 }, (_, i) => ({
            id: `c${i}`,
            name: `Cat${i}`,
            icon: null,
            color: null,
            type: "expense" as const,
        }));
        const expenses = cats.map((c, i) => ({
            id: `e${i}`,
            categoryId: c.id,
            year: 2026,
            month: 6,
            amount: (i + 1) * 1000,
            source: "manual" as const,
            confidence: null,
            notes: null,
        }));

        const snap = makeSnapshot({ categories: cats, expenses });
        const result = computeAnalytics(snap, 6);
        expect(result.topCategories).toHaveLength(5);
        expect(result.topCategories[0].amount).toBe(7000);
        expect(result.topCategories[4].amount).toBe(3000);
    });
});

describe("computeSparkline", () => {
    it("returns 6 months of data", () => {
        const snap = makeSnapshot({
            expenses: [
                {
                    id: "e1",
                    categoryId: "c1",
                    year: 2026,
                    month: 6,
                    amount: 5000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e2",
                    categoryId: "c1",
                    year: 2026,
                    month: 5,
                    amount: 4000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
            ],
            income: [
                {
                    id: "i1",
                    year: 2026,
                    month: 6,
                    amount: 100000,
                    source: "salary",
                    createdAt: "2026-06-01",
                },
            ],
        });

        const result = computeSparkline(snap, 6, 6);
        expect(result.months).toHaveLength(6);
        expect(result.expenses).toHaveLength(6);
        expect(result.income).toHaveLength(6);
        expect(result.expenses[5]).toBe(5000); // June
        expect(result.expenses[4]).toBe(4000); // May
        expect(result.income[5]).toBe(100000);
    });

    it("handles year boundary (month 1)", () => {
        const snap = makeSnapshot({
            year: 2026,
            expenses: [
                {
                    id: "e1",
                    categoryId: "c1",
                    year: 2025,
                    month: 12,
                    amount: 3000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
                {
                    id: "e2",
                    categoryId: "c1",
                    year: 2026,
                    month: 1,
                    amount: 4000,
                    source: "manual",
                    confidence: null,
                    notes: null,
                },
            ],
        });

        const result = computeSparkline(snap, 1, 3);
        expect(result.months).toHaveLength(3);
        // Nov, Dec (2025), Jan (2026)
        expect(result.expenses[1]).toBe(3000); // Dec 2025
        expect(result.expenses[2]).toBe(4000); // Jan 2026
    });

    it("returns zeros for months with no data", () => {
        const snap = makeSnapshot();
        const result = computeSparkline(snap, 6, 3);
        expect(result.expenses).toEqual([0, 0, 0]);
        expect(result.income).toEqual([0, 0, 0]);
    });
});
