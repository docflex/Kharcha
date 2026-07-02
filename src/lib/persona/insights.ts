import type { PersonaSignals, Insight } from "./types";

const MAX_INSIGHTS = 5;

/**
 * Generate 3-5 insights from persona signals.
 *
 * Rules (from master plan):
 * - Top 3 increasing categories (with % and absolute change)
 * - Top 3 decreasing categories
 * - Categories that exceeded budget
 * - Categories significantly under budget
 * - Unusual patterns (one-time large expenses)
 * - Savings rate trend (improving/declining)
 */
export function generateInsights(signals: PersonaSignals): Insight[] {
    const insights: Insight[] = [];

    // 1. Over-budget categories (negative sentiment)
    addOverBudgetInsights(signals, insights);

    // 2. Top increasing categories (negative sentiment)
    addIncreasingCategoryInsights(signals, insights);

    // 3. Top decreasing categories (positive sentiment)
    addDecreasingCategoryInsights(signals, insights);

    // 4. Significantly under budget (positive sentiment)
    addUnderBudgetInsights(signals, insights);

    // 5. New categories appeared (neutral)
    addNewCategoryInsights(signals, insights);

    // 6. Savings rate insight
    addSavingsInsight(signals, insights);

    // Cap at MAX_INSIGHTS
    return insights.slice(0, MAX_INSIGHTS);
}

function addOverBudgetInsights(signals: PersonaSignals, insights: Insight[]): void {
    const overBudget = signals.budgetStatuses.filter((b) => b.status === "over");
    for (const b of overBudget.slice(0, 2)) {
        const overBy = b.actual - b.budgetLimit;
        insights.push({
            type: "over_budget",
            message: `${b.categoryName} exceeded budget by ₹${formatNum(overBy)} (${Math.round(b.percentUsed)}% of ₹${formatNum(b.budgetLimit)} limit)`,
            categoryName: b.categoryName,
            sentiment: "negative",
        });
    }
}

function addIncreasingCategoryInsights(signals: PersonaSignals, insights: Insight[]): void {
    const increasing = signals.categoryMoMChanges
        .filter((c) => c.percentChange !== null && c.percentChange > 10 && c.currentAmount > 0)
        .sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0))
        .slice(0, 2);

    for (const c of increasing) {
        if (insights.length >= MAX_INSIGHTS) break;
        const absChange = c.currentAmount - c.previousAmount;
        insights.push({
            type: "spending_increase",
            message: `${c.categoryName} is up ${Math.round(c.percentChange!)}% (+₹${formatNum(absChange)}) vs last month`,
            categoryName: c.categoryName,
            sentiment: "negative",
        });
    }
}

function addDecreasingCategoryInsights(signals: PersonaSignals, insights: Insight[]): void {
    const decreasing = signals.categoryMoMChanges
        .filter((c) => c.percentChange !== null && c.percentChange < -10 && c.previousAmount > 0)
        .sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0))
        .slice(0, 2);

    for (const c of decreasing) {
        if (insights.length >= MAX_INSIGHTS) break;
        const saved = c.previousAmount - c.currentAmount;
        insights.push({
            type: "spending_decrease",
            message: `${c.categoryName} dropped ${Math.abs(Math.round(c.percentChange!))}% (-₹${formatNum(saved)}) — great job!`,
            categoryName: c.categoryName,
            sentiment: "positive",
        });
    }
}

function addUnderBudgetInsights(signals: PersonaSignals, insights: Insight[]): void {
    const underBudget = signals.budgetStatuses
        .filter((b) => b.status === "under" && b.percentUsed < 50)
        .sort((a, b) => a.percentUsed - b.percentUsed)
        .slice(0, 1);

    for (const b of underBudget) {
        if (insights.length >= MAX_INSIGHTS) break;
        const remaining = b.budgetLimit - b.actual;
        insights.push({
            type: "under_budget",
            message: `${b.categoryName} is well under budget — ₹${formatNum(remaining)} remaining of ₹${formatNum(b.budgetLimit)}`,
            categoryName: b.categoryName,
            sentiment: "positive",
        });
    }
}

function addNewCategoryInsights(signals: PersonaSignals, insights: Insight[]): void {
    if (signals.newCategories.length > 0 && insights.length < MAX_INSIGHTS) {
        const names = signals.newCategories.slice(0, 3).join(", ");
        insights.push({
            type: "new_category",
            message:
                signals.newCategories.length === 1
                    ? `New category this month: ${names}`
                    : `New categories this month: ${names}`,
            sentiment: "neutral",
        });
    }
}

function addSavingsInsight(signals: PersonaSignals, insights: Insight[]): void {
    if (insights.length >= MAX_INSIGHTS || signals.totalIncome === 0) return;

    if (signals.savingsRate > 30) {
        insights.push({
            type: "savings_trend",
            message: `You saved ${Math.round(signals.savingsRate)}% of income this month — above average!`,
            sentiment: "positive",
        });
    } else if (signals.savingsRate < 0) {
        insights.push({
            type: "savings_trend",
            message: `Spending exceeded income by ₹${formatNum(Math.abs(signals.totalIncome - signals.totalSpend))} — negative savings this month`,
            sentiment: "negative",
        });
    }
}

/** Format a number with Indian commas for insight messages */
function formatNum(n: number): string {
    return Math.round(n).toLocaleString("en-IN");
}
