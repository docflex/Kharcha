import type { PersonaSignals, Recommendation } from "./types";

/**
 * Generate recommendations from persona signals.
 *
 * Rules (from master plan):
 * - Cut back: Categories > 120% of budget, suggest specific reduction amount
 * - Room to spend: Categories < 60% of budget
 * - Watch out: Categories trending up for 3+ consecutive months
 * - Great job: Categories trending down or consistently under budget
 */
export function generateRecommendations(signals: PersonaSignals): Recommendation[] {
    const recs: Recommendation[] = [];

    // 1. Cut back — over 120% of budget
    addCutBackRecs(signals, recs);

    // 2. Watch out — trending up 3+ months
    addWatchOutRecs(signals, recs);

    // 3. Great job — trending down or consistently under budget
    addGreatJobRecs(signals, recs);

    // 4. Room to spend — under 60% of budget
    addRoomToSpendRecs(signals, recs);

    // 5. Income-based fallbacks when no budgets exist
    if (signals.budgetStatuses.length === 0) {
        addFallbackRecs(signals, recs);
    }

    return recs;
}

function addCutBackRecs(signals: PersonaSignals, recs: Recommendation[]): void {
    const overBudget = signals.budgetStatuses
        .filter((b) => b.percentUsed > 120)
        .sort((a, b) => b.percentUsed - a.percentUsed);

    for (const b of overBudget) {
        const cutAmount = b.actual - b.budgetLimit;
        recs.push({
            type: "cut_back",
            message: `Cut back: ${b.categoryName} (₹${formatNum(b.actual)} vs ₹${formatNum(b.budgetLimit)} budget) — reduce by ₹${formatNum(cutAmount)}`,
            categoryName: b.categoryName,
            amount: cutAmount,
        });
    }
}

function addWatchOutRecs(signals: PersonaSignals, recs: Recommendation[]): void {
    const trending = signals.trends
        .filter((t) => t.consecutiveMonthsUp >= 3)
        .sort((a, b) => b.consecutiveMonthsUp - a.consecutiveMonthsUp);

    for (const t of trending.slice(0, 2)) {
        recs.push({
            type: "watch_out",
            message: `Watch out: ${t.categoryName} has been rising for ${t.consecutiveMonthsUp} consecutive months`,
            categoryName: t.categoryName,
        });
    }
}

function addGreatJobRecs(signals: PersonaSignals, recs: Recommendation[]): void {
    // Trending down
    const trendingDown = signals.trends
        .filter((t) => t.consecutiveMonthsDown >= 2)
        .sort((a, b) => b.consecutiveMonthsDown - a.consecutiveMonthsDown);

    for (const t of trendingDown.slice(0, 2)) {
        recs.push({
            type: "great_job",
            message: `Great job: ${t.categoryName} has been decreasing for ${t.consecutiveMonthsDown} consecutive months`,
            categoryName: t.categoryName,
        });
    }

    // Consistently under budget (< 50% used)
    const underBudget = signals.budgetStatuses
        .filter((b) => b.percentUsed < 50 && b.actual > 0)
        .sort((a, b) => a.percentUsed - b.percentUsed);

    for (const b of underBudget.slice(0, 1)) {
        if (!recs.some((r) => r.categoryName === b.categoryName && r.type === "great_job")) {
            recs.push({
                type: "great_job",
                message: `Great job: ${b.categoryName} is well within budget at ${Math.round(b.percentUsed)}%`,
                categoryName: b.categoryName,
            });
        }
    }
}

function addRoomToSpendRecs(signals: PersonaSignals, recs: Recommendation[]): void {
    const underBudget = signals.budgetStatuses
        .filter((b) => b.percentUsed < 60 && b.budgetLimit > 0)
        .sort((a, b) => a.percentUsed - b.percentUsed);

    for (const b of underBudget.slice(0, 2)) {
        const room = b.budgetLimit - b.actual;
        recs.push({
            type: "room_to_spend",
            message: `Room to spend: ${b.categoryName} (₹${formatNum(b.actual)} vs ₹${formatNum(b.budgetLimit)} budget) — ₹${formatNum(room)} available`,
            categoryName: b.categoryName,
            amount: room,
        });
    }
}

/**
 * Income-based fallback recommendations when no budgets are set.
 * Ensures the persona page always shows actionable advice.
 */
function addFallbackRecs(signals: PersonaSignals, recs: Recommendation[]): void {
    // 1. Negative savings — spending exceeded income
    if (signals.savingsRate < 0 && signals.totalIncome > 0) {
        const overspend = signals.totalSpend - signals.totalIncome;
        const topCats = signals.categoryMoMChanges
            .filter((c) => c.currentAmount > 0)
            .sort((a, b) => b.currentAmount - a.currentAmount)
            .slice(0, 3)
            .map((c) => c.categoryName);
        const reviewList = topCats.length > 0 ? ` Review: ${topCats.join(", ")}` : "";
        recs.push({
            type: "cut_back",
            message: `Spending exceeded income by ₹${formatNum(overspend)}.${reviewList}`,
            categoryName: topCats[0] ?? "Overall",
            amount: overspend,
        });
    }

    // 2. MoM increase > 20% on any category
    const spiked = signals.categoryMoMChanges
        .filter((c) => c.percentChange !== null && c.percentChange > 20 && c.currentAmount > 0)
        .sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0));

    for (const c of spiked.slice(0, 2)) {
        if (!recs.some((r) => r.type === "watch_out" && r.categoryName === c.categoryName)) {
            recs.push({
                type: "watch_out",
                message: `Watch out: ${c.categoryName} jumped ${Math.round(c.percentChange!)}% vs last month`,
                categoryName: c.categoryName,
            });
        }
    }

    // 3. High spend ratio with no budgets — suggest setting targets
    if (
        signals.totalIncome > 0 &&
        signals.totalSpend > signals.totalIncome * 0.9 &&
        signals.totalBudgetedCategories === 0
    ) {
        recs.push({
            type: "watch_out",
            message: `You're spending ${Math.round((signals.totalSpend / signals.totalIncome) * 100)}% of income with no budget targets. Consider setting budgets to track limits.`,
            categoryName: "Overall",
        });
    }
}

/** Format a number with Indian commas */
function formatNum(n: number): string {
    return Math.round(n).toLocaleString("en-IN");
}
