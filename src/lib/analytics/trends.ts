import { eq, and, sum, gte, lte, desc } from "drizzle-orm";
import { expenses, categories } from "@/lib/db/schema";
import type { Db, CategoryTrend, TrendDirection, CategorySpend } from "./types";

/**
 * Determine trend direction from a series of data points.
 * Uses simple linear regression sign of slope.
 */
function detectTrend(values: number[]): TrendDirection {
    if (values.length < 2) return "stable";

    const n = values.length;
    const first = values[0];
    const last = values[n - 1];

    // If all values are the same, it's stable
    if (values.every((v) => v === first)) return "stable";

    // Simple: compare first half average to second half average
    const mid = Math.floor(n / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

    const changePct = avgFirst === 0 ? 0 : ((avgSecond - avgFirst) / avgFirst) * 100;

    // Threshold: <5% change is "stable"
    if (Math.abs(changePct) < 5) return "stable";
    return changePct > 0 ? "up" : "down";
}

/**
 * Generate a list of { year, month } pairs between start and end (inclusive).
 */
function generateMonthRange(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
): { year: number; month: number }[] {
    const result: { year: number; month: number }[] = [];
    let y = startYear;
    let m = startMonth;

    while (y < endYear || (y === endYear && m <= endMonth)) {
        result.push({ year: y, month: m });
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }

    return result;
}

/**
 * Get trends for all categories that had spending in the given range.
 * Returns one trend object per category with data points for each month.
 */
export async function getCategoryTrends(
    db: Db,
    userId: string,
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
): Promise<CategoryTrend[]> {
    const monthRange = generateMonthRange(startYear, startMonth, endYear, endMonth);

    // Get all spending in the range
    const rows = await db
        .select({
            categoryId: expenses.categoryId,
            categoryName: categories.name,
            year: expenses.year,
            month: expenses.month,
            totalAmount: sum(expenses.amount),
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.userId, userId)))
        .groupBy(expenses.categoryId, categories.name, expenses.year, expenses.month);

    // Filter to the date range
    const filtered = rows.filter((r) => {
        const val = r.year * 100 + r.month;
        const start = startYear * 100 + startMonth;
        const end = endYear * 100 + endMonth;
        return val >= start && val <= end;
    });

    // Group by category
    const categoryMap = new Map<string, { categoryName: string; data: Map<string, number> }>();

    for (const row of filtered) {
        const key = `${row.year}-${row.month}`;
        if (!categoryMap.has(row.categoryId)) {
            categoryMap.set(row.categoryId, {
                categoryName: row.categoryName,
                data: new Map(),
            });
        }
        const cat = categoryMap.get(row.categoryId)!;
        cat.data.set(key, Number(row.totalAmount) || 0);
    }

    // Build trends
    const trends: CategoryTrend[] = [];

    for (const [categoryId, { categoryName, data }] of categoryMap) {
        const dataPoints = monthRange.map((m) => ({
            year: m.year,
            month: m.month,
            amount: data.get(`${m.year}-${m.month}`) || 0,
        }));

        const amounts = dataPoints.map((dp) => dp.amount);
        const nonZeroAmounts = amounts.filter((a) => a > 0);

        trends.push({
            categoryId,
            categoryName,
            dataPoints,
            direction: detectTrend(amounts),
            averageAmount:
                amounts.length > 0 ? amounts.reduce((s, a) => s + a, 0) / amounts.length : 0,
            minAmount: nonZeroAmounts.length > 0 ? Math.min(...amounts) : 0,
            maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
        });
    }

    return trends;
}

/**
 * Get top N categories by spending for a given month.
 */
export async function getTopCategories(
    db: Db,
    userId: string,
    year: number,
    month: number,
    limit: number = 10
): Promise<CategorySpend[]> {
    const rows = await db
        .select({
            categoryId: expenses.categoryId,
            categoryName: categories.name,
            categoryType: categories.type,
            totalAmount: sum(expenses.amount),
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.userId, userId), eq(expenses.year, year), eq(expenses.month, month)))
        .groupBy(expenses.categoryId, categories.name, categories.type)
        .orderBy(desc(sum(expenses.amount)))
        .limit(limit);

    return rows.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        amount: Number(r.totalAmount) || 0,
        type: r.categoryType as "expense" | "investment",
    }));
}
