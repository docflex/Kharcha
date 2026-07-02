/**
 * Client-side analytics computed from a cached snapshot.
 * Replaces 5+ server round-trips with in-memory computation.
 */

import type { Snapshot } from "@/hooks/use-snapshot";

interface CategorySpend {
    categoryId: string;
    categoryName: string;
    amount: number;
    type: string;
}

interface CategoryMoMChange {
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    previousAmount: number;
    absoluteChange: number;
    percentChange: number | null;
}

export interface ClientAnalytics {
    summary: {
        totalSpend: number;
        totalInvestments: number;
        totalExpenses: number;
        categories: CategorySpend[];
    };
    mom: {
        totalCurrentSpend: number;
        totalPreviousSpend: number;
        totalPercentChange: number | null;
        categories: CategoryMoMChange[];
    };
    savings: {
        totalIncome: number;
        totalSpend: number;
        savings: number;
        savingsRate: number;
    };
    budgetOverview: {
        statuses: {
            categoryName: string;
            actual: number;
            budgetLimit: number;
            percentUsed: number;
            status: string;
        }[];
        overBudgetCount: number;
        underBudgetCount: number;
        onTrackCount: number;
    };
    topCategories: CategorySpend[];
}

/**
 * Compute full analytics for a given month from the snapshot.
 */
export function computeAnalytics(snapshot: Snapshot, month: number): ClientAnalytics {
    const { expenses, income, categories, budgets } = snapshot;

    // Category lookup
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // ─── Month Summary ──────────────────────────────────────────────────────
    const monthExpenses = expenses.filter((e) => e.month === month);
    const byCat = new Map<string, number>();
    for (const e of monthExpenses) {
        byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
    }

    const categorySpends: CategorySpend[] = [];
    let totalExpenses = 0;
    let totalInvestments = 0;
    for (const [catId, amount] of byCat) {
        const cat = catMap.get(catId);
        const name = cat?.name ?? "Unknown";
        const type = cat?.type ?? "expense";
        categorySpends.push({ categoryId: catId, categoryName: name, amount, type });
        if (type === "investment") totalInvestments += amount;
        else totalExpenses += amount;
    }
    const totalSpend = totalExpenses + totalInvestments;

    // ─── MoM Comparison ─────────────────────────────────────────────────────
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevExpenses = expenses.filter((e) => e.month === prevMonth);
    const prevByCat = new Map<string, number>();
    for (const e of prevExpenses) {
        prevByCat.set(e.categoryId, (prevByCat.get(e.categoryId) ?? 0) + e.amount);
    }

    const totalPreviousSpend = Array.from(prevByCat.values()).reduce((s, a) => s + a, 0);
    const totalPercentChange =
        totalPreviousSpend > 0
            ? ((totalSpend - totalPreviousSpend) / totalPreviousSpend) * 100
            : null;

    const allCatIds = new Set([...byCat.keys(), ...prevByCat.keys()]);
    const momCategories: CategoryMoMChange[] = [];
    for (const catId of allCatIds) {
        const current = byCat.get(catId) ?? 0;
        const previous = prevByCat.get(catId) ?? 0;
        const cat = catMap.get(catId);
        momCategories.push({
            categoryId: catId,
            categoryName: cat?.name ?? "Unknown",
            currentAmount: current,
            previousAmount: previous,
            absoluteChange: current - previous,
            percentChange: previous > 0 ? ((current - previous) / previous) * 100 : null,
        });
    }

    // ─── Savings ────────────────────────────────────────────────────────────
    const monthIncome = income.filter((i) => i.month === month).reduce((s, i) => s + i.amount, 0);
    const savings = monthIncome - totalSpend;
    const savingsRate = monthIncome > 0 ? (savings / monthIncome) * 100 : 0;

    // ─── Budget Overview ────────────────────────────────────────────────────
    const monthStr = `${snapshot.year}-${String(month).padStart(2, "0")}`;
    const activeBudgets = budgets.filter((b) => {
        if (b.effectiveFrom > monthStr) return false;
        if (b.effectiveUntil && b.effectiveUntil < monthStr) return false;
        return true;
    });

    const budgetStatuses = activeBudgets.map((b) => {
        const cat = catMap.get(b.categoryId);
        const actual = byCat.get(b.categoryId) ?? 0;
        const percentUsed = b.monthlyLimit > 0 ? (actual / b.monthlyLimit) * 100 : 0;
        let status = "on_track";
        if (percentUsed >= 100) status = "over";
        else if (percentUsed >= 80) status = "warning";

        return {
            categoryName: cat?.name ?? "Unknown",
            actual,
            budgetLimit: b.monthlyLimit,
            percentUsed,
            status,
        };
    });

    // ─── Top Categories ─────────────────────────────────────────────────────
    const topCategories = [...categorySpends].sort((a, b) => b.amount - a.amount).slice(0, 5);

    return {
        summary: {
            totalSpend,
            totalInvestments,
            totalExpenses,
            categories: categorySpends,
        },
        mom: {
            totalCurrentSpend: totalSpend,
            totalPreviousSpend: totalPreviousSpend,
            totalPercentChange,
            categories: momCategories,
        },
        savings: {
            totalIncome: monthIncome,
            totalSpend,
            savings,
            savingsRate,
        },
        budgetOverview: {
            statuses: budgetStatuses,
            overBudgetCount: budgetStatuses.filter((s) => s.status === "over").length,
            underBudgetCount: budgetStatuses.filter((s) => s.status === "on_track").length,
            onTrackCount: budgetStatuses.filter((s) => s.status === "warning").length,
        },
        topCategories,
    };
}

/**
 * Compute sparkline data (last N months) from snapshot.
 */
export function computeSparkline(
    snapshot: Snapshot,
    month: number,
    numMonths: number = 6
): { months: string[]; expenses: number[]; income: number[] } {
    const months: string[] = [];
    const expenseValues: number[] = [];
    const incomeValues: number[] = [];

    for (let i = numMonths - 1; i >= 0; i--) {
        let m = month - i;
        let y = snapshot.year;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }

        const monthName = new Date(y, m - 1).toLocaleString("en-IN", { month: "short" });
        months.push(monthName);

        const monthExp = snapshot.expenses
            .filter((e) => e.year === y && e.month === m)
            .reduce((s, e) => s + e.amount, 0);
        expenseValues.push(monthExp);

        const monthInc = snapshot.income
            .filter((inc) => inc.year === y && inc.month === m)
            .reduce((s, inc) => s + inc.amount, 0);
        incomeValues.push(monthInc);
    }

    return { months, expenses: expenseValues, income: incomeValues };
}
