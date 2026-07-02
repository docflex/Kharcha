import { eq, and, sum } from "drizzle-orm";
import { expenses, categories } from "@/lib/db/schema";
import type { Db, CategorySpend } from "./types";

/** Spending data for one year in a YoY comparison */
export interface YoYYearData {
    year: number;
    totalSpend: number;
    categories: CategorySpend[];
}

/** Full YoY comparison result */
export interface YoYResult {
    month: number;
    years: YoYYearData[];
    allCategories: string[]; // union of all category names across all years
}

/**
 * Get same-month spending across all available years.
 * Returns grouped data suitable for a side-by-side bar chart.
 */
export async function getYoYComparison(db: Db, userId: string, month: number): Promise<YoYResult> {
    // Get all spending for this month across all years
    const rows = await db
        .select({
            categoryId: expenses.categoryId,
            categoryName: categories.name,
            categoryType: categories.type,
            year: expenses.year,
            totalAmount: sum(expenses.amount),
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.userId, userId), eq(expenses.month, month)))
        .groupBy(expenses.categoryId, categories.name, categories.type, expenses.year);

    if (rows.length === 0) {
        return { month, years: [], allCategories: [] };
    }

    // Group by year
    const yearMap = new Map<number, CategorySpend[]>();
    const allCategoryNames = new Set<string>();

    for (const row of rows) {
        if (!yearMap.has(row.year)) {
            yearMap.set(row.year, []);
        }
        const amount = Number(row.totalAmount) || 0;
        yearMap.get(row.year)!.push({
            categoryId: row.categoryId,
            categoryName: row.categoryName,
            amount,
            type: row.categoryType as "expense" | "investment",
        });
        allCategoryNames.add(row.categoryName);
    }

    // Build sorted year data
    const years: YoYYearData[] = [];
    for (const [year, cats] of yearMap) {
        years.push({
            year,
            totalSpend: cats.reduce((s, c) => s + c.amount, 0),
            categories: cats.sort((a, b) => b.amount - a.amount),
        });
    }
    years.sort((a, b) => a.year - b.year);

    return {
        month,
        years,
        allCategories: Array.from(allCategoryNames).sort(),
    };
}
