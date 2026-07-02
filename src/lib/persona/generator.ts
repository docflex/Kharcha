import type { Db } from "../analytics/types";
import { getMonthSummary, getMoMComparison } from "../analytics/mom";
import { calculateSavings } from "../analytics/savings";
import { getBudgetOverview } from "../analytics/budget";
import { getCategoryTrends } from "../analytics/trends";
import { matchPersona } from "./archetypes";
import { generateInsights } from "./insights";
import { generateRecommendations } from "./recommendations";
import type {
    PersonaSignals,
    PersonaResult,
    CategoryMoMSignal,
    BudgetCategorySignal,
    TrendSignal,
} from "./types";

/**
 * Build persona signals by gathering data from the analytics engine.
 * This is the "signal assembly" step — pure data gathering, no persona logic.
 */
export async function buildPersonaSignals(
    db: Db,
    userId: string,
    year: number,
    month: number
): Promise<PersonaSignals> {
    const [monthSummary, mom, savings, budgetOverview] = await Promise.all([
        getMonthSummary(db, userId, year, month),
        getMoMComparison(db, userId, year, month),
        calculateSavings(db, userId, year, month),
        getBudgetOverview(db, userId, year, month),
    ]);

    // Build category MoM signals
    const categoryMoMChanges: CategoryMoMSignal[] = mom.categories.map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        currentAmount: c.currentAmount,
        previousAmount: c.previousAmount,
        percentChange: c.percentChange,
    }));

    // Build budget signals
    const budgetStatuses: BudgetCategorySignal[] = budgetOverview.statuses.map((s) => ({
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        actual: s.actual,
        budgetLimit: s.budgetLimit,
        percentUsed: s.percentUsed,
        status: s.status,
    }));

    // Build trend signals — look back 3 months for consecutive direction detection
    let trends: TrendSignal[] = [];
    try {
        // Calculate start month (3 months back)
        let startMonth = month - 2;
        let startYear = year;
        if (startMonth <= 0) {
            startMonth += 12;
            startYear--;
        }

        const categoryTrends = await getCategoryTrends(
            db,
            userId,
            startYear,
            startMonth,
            year,
            month
        );

        trends = categoryTrends.map((t) => {
            const amounts = t.dataPoints.map((dp) => dp.amount);
            return {
                categoryId: t.categoryId,
                categoryName: t.categoryName,
                direction: t.direction,
                consecutiveMonthsUp: countConsecutiveEnd(amounts, "up"),
                consecutiveMonthsDown: countConsecutiveEnd(amounts, "down"),
            };
        });
    } catch (_error) {
        // Trends are optional — if they fail, continue without them
    }

    return {
        year,
        month,
        totalSpend: monthSummary.totalSpend,
        totalIncome: savings.totalIncome,
        savingsRate: savings.savingsRate,
        momChangePct: mom.totalPercentChange,
        overBudgetCount: budgetOverview.overBudgetCount,
        underBudgetCount: budgetOverview.underBudgetCount,
        onTrackCount: budgetOverview.onTrackCount,
        totalBudgetedCategories: budgetOverview.statuses.length,
        newCategories: mom.newCategories,
        droppedCategories: mom.droppedCategories,
        categoryMoMChanges,
        budgetStatuses,
        trends,
    };
}

/**
 * Count consecutive months of increase/decrease from the END of the array.
 */
function countConsecutiveEnd(amounts: number[], direction: "up" | "down"): number {
    let count = 0;
    for (let i = amounts.length - 1; i > 0; i--) {
        const diff = amounts[i] - amounts[i - 1];
        if (direction === "up" && diff > 0) count++;
        else if (direction === "down" && diff < 0) count++;
        else break;
    }
    return count;
}

/**
 * Generate the full persona result for a given month.
 * This is the main entry point for the persona engine.
 */
export async function generatePersona(
    db: Db,
    userId: string,
    year: number,
    month: number
): Promise<PersonaResult> {
    const signals = await buildPersonaSignals(db, userId, year, month);
    const archetype = matchPersona(signals);
    const insights = generateInsights(signals);
    const recommendations = generateRecommendations(signals);

    return {
        year,
        month,
        persona: {
            name: archetype.name,
            emoji: archetype.emoji,
            description: archetype.description,
        },
        metrics: {
            totalSpend: signals.totalSpend,
            totalIncome: signals.totalIncome,
            savingsRate: signals.savingsRate,
            momChangePct: signals.momChangePct,
            overBudgetCount: signals.overBudgetCount,
            underBudgetCount: signals.underBudgetCount,
        },
        insights,
        recommendations,
    };
}
