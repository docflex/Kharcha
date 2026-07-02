import { eq, and, sum, lte, or, isNull, gte } from "drizzle-orm";
import { expenses, budgets, categories } from "@/lib/db/schema";
import type { Db, BudgetStatus, BudgetOverview } from "./types";

/**
 * Status thresholds:
 * - "under":    < 60% used
 * - "on-track": 60-80% used
 * - "warning":  80-100% used
 * - "over":     > 100% used
 */
function getStatus(percentUsed: number): BudgetStatus["status"] {
    if (percentUsed > 100) return "over";
    if (percentUsed >= 80) return "warning";
    if (percentUsed >= 60) return "on-track";
    return "under";
}

/**
 * Get budget overview for a specific month.
 * Returns status for each category that has an active budget.
 */
export async function getBudgetOverview(
    db: Db,
    userId: string,
    year: number,
    month: number
): Promise<BudgetOverview> {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    // Get all active budgets for this month
    const activeBudgets = await db
        .select({
            budgetId: budgets.id,
            categoryId: budgets.categoryId,
            categoryName: categories.name,
            monthlyLimit: budgets.monthlyLimit,
        })
        .from(budgets)
        .innerJoin(categories, eq(budgets.categoryId, categories.id))
        .where(
            and(
                eq(budgets.userId, userId),
                lte(budgets.effectiveFrom, monthStr),
                or(isNull(budgets.effectiveUntil), gte(budgets.effectiveUntil, monthStr))
            )
        );

    if (activeBudgets.length === 0) {
        return {
            year,
            month,
            statuses: [],
            overBudgetCount: 0,
            underBudgetCount: 0,
            onTrackCount: 0,
        };
    }

    // Get actual spending per category for this month
    const spending = await db
        .select({
            categoryId: expenses.categoryId,
            totalAmount: sum(expenses.amount),
        })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.year, year), eq(expenses.month, month)))
        .groupBy(expenses.categoryId);

    const spendMap = new Map(spending.map((s) => [s.categoryId, Number(s.totalAmount) || 0]));

    const statuses: BudgetStatus[] = activeBudgets.map((b) => {
        const actual = spendMap.get(b.categoryId) || 0;
        const remaining = b.monthlyLimit - actual;
        const percentUsed = b.monthlyLimit > 0 ? (actual / b.monthlyLimit) * 100 : 0;

        return {
            categoryId: b.categoryId,
            categoryName: b.categoryName,
            actual,
            budgetLimit: b.monthlyLimit,
            remaining,
            percentUsed,
            status: getStatus(percentUsed),
        };
    });

    return {
        year,
        month,
        statuses,
        overBudgetCount: statuses.filter((s) => s.status === "over").length,
        underBudgetCount: statuses.filter((s) => s.status === "under").length,
        onTrackCount: statuses.filter((s) => s.status === "on-track" || s.status === "warning")
            .length,
    };
}
