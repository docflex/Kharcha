import { eq, and, sum } from "drizzle-orm";
import { expenses, categories, budgets } from "@/lib/db/schema";
import type { Db } from "./types";

/** A single month's data point in the deep-dive */
export interface DeepDiveDataPoint {
    year: number;
    month: number;
    amount: number;
    budgetLimit: number | null;
    budgetStatus: "under" | "on-track" | "warning" | "over" | null;
    isAnomaly: boolean;
}

/** Statistical summary for the category */
export interface DeepDiveStats {
    average: number;
    min: number;
    max: number;
    stddev: number;
    totalMonths: number;
}

/** Full category deep-dive result */
export interface CategoryDeepDiveResult {
    categoryId: string;
    categoryName: string;
    categoryType: "expense" | "investment";
    dataPoints: DeepDiveDataPoint[];
    stats: DeepDiveStats;
    budgetLimit: number | null; // current active budget
}

/**
 * Get full historical deep-dive for a single category.
 * Includes trend, budget adherence, anomaly detection.
 */
export async function getCategoryDeepDive(
    db: Db,
    userId: string,
    categoryId: string
): Promise<CategoryDeepDiveResult | null> {
    // Verify category exists and belongs to user
    const [category] = await db
        .select({
            id: categories.id,
            name: categories.name,
            type: categories.type,
        })
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

    if (!category) return null;

    // Get all monthly spending for this category
    const rows = await db
        .select({
            year: expenses.year,
            month: expenses.month,
            totalAmount: sum(expenses.amount),
        })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.categoryId, categoryId)))
        .groupBy(expenses.year, expenses.month);

    // Sort chronologically
    const sorted = rows
        .map((r) => ({
            year: r.year,
            month: r.month,
            amount: Number(r.totalAmount) || 0,
        }))
        .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));

    if (sorted.length === 0) {
        return {
            categoryId,
            categoryName: category.name,
            categoryType: category.type as "expense" | "investment",
            dataPoints: [],
            stats: { average: 0, min: 0, max: 0, stddev: 0, totalMonths: 0 },
            budgetLimit: null,
        };
    }

    // Get all budgets for this category
    const budgetRows = await db
        .select({
            monthlyLimit: budgets.monthlyLimit,
            effectiveFrom: budgets.effectiveFrom,
            effectiveUntil: budgets.effectiveUntil,
        })
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId)));

    // Compute stats
    const amounts = sorted.map((s) => s.amount);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    // Find the current (most recent) active budget
    const currentBudget =
        budgetRows.length > 0
            ? budgetRows.reduce((latest, b) => {
                  if (!latest) return b;
                  return b.effectiveFrom > latest.effectiveFrom ? b : latest;
              })
            : null;

    // Build data points with budget status and anomaly detection
    const dataPoints: DeepDiveDataPoint[] = sorted.map((s) => {
        const monthStr = `${s.year}-${String(s.month).padStart(2, "0")}`;

        // Find applicable budget for this month
        const applicableBudget = budgetRows.find((b) => {
            const from = b.effectiveFrom <= monthStr;
            const until = !b.effectiveUntil || b.effectiveUntil >= monthStr;
            return from && until;
        });

        const budgetLimit = applicableBudget?.monthlyLimit ?? null;
        let budgetStatus: DeepDiveDataPoint["budgetStatus"] = null;

        if (budgetLimit !== null) {
            const pct = (s.amount / budgetLimit) * 100;
            if (pct > 100) budgetStatus = "over";
            else if (pct >= 80) budgetStatus = "warning";
            else if (pct >= 60) budgetStatus = "on-track";
            else budgetStatus = "under";
        }

        // Anomaly: >1.5 stddev from mean
        const isAnomaly = stddev > 0 && Math.abs(s.amount - avg) > 1.5 * stddev;

        return {
            year: s.year,
            month: s.month,
            amount: s.amount,
            budgetLimit,
            budgetStatus,
            isAnomaly,
        };
    });

    return {
        categoryId,
        categoryName: category.name,
        categoryType: category.type as "expense" | "investment",
        dataPoints,
        stats: {
            average: avg,
            min,
            max,
            stddev,
            totalMonths: amounts.length,
        },
        budgetLimit: currentBudget?.monthlyLimit ?? null,
    };
}
