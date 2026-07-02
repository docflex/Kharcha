import { eq, and, sum } from "drizzle-orm";
import { expenses, categories } from "@/lib/db/schema";
import type { Db } from "./types";

/** A single cell in the heatmap grid */
export interface HeatmapCell {
    month: number; // 1-12
    amount: number;
    intensity: number; // 0-1 normalized
}

/** One row in the heatmap — one category's 12-month spending */
export interface HeatmapRow {
    categoryId: string;
    categoryName: string;
    type: "expense" | "investment";
    months: HeatmapCell[];
}

/** Full heatmap result */
export interface HeatmapResult {
    year: number;
    categories: HeatmapRow[];
    maxAmount: number;
}

/**
 * Compute a 12-month × N-category heatmap for a given year.
 * Intensity is normalized 0-1 across the entire grid (max cell = 1).
 */
export async function getCategoryHeatmap(
    db: Db,
    userId: string,
    year: number
): Promise<HeatmapResult> {
    // Get all spending grouped by category + month for the year
    const rows = await db
        .select({
            categoryId: expenses.categoryId,
            categoryName: categories.name,
            categoryType: categories.type,
            month: expenses.month,
            totalAmount: sum(expenses.amount),
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.userId, userId), eq(expenses.year, year)))
        .groupBy(expenses.categoryId, categories.name, categories.type, expenses.month);

    if (rows.length === 0) {
        return { year, categories: [], maxAmount: 0 };
    }

    // Group by category
    const categoryMap = new Map<
        string,
        { categoryName: string; type: string; data: Map<number, number> }
    >();

    for (const row of rows) {
        if (!categoryMap.has(row.categoryId)) {
            categoryMap.set(row.categoryId, {
                categoryName: row.categoryName,
                type: row.categoryType,
                data: new Map(),
            });
        }
        const cat = categoryMap.get(row.categoryId)!;
        cat.data.set(row.month, Number(row.totalAmount) || 0);
    }

    // Find global max for intensity normalization
    let maxAmount = 0;
    for (const { data } of categoryMap.values()) {
        for (const amount of data.values()) {
            if (amount > maxAmount) maxAmount = amount;
        }
    }

    // Build rows with 12 months each
    const heatmapRows: HeatmapRow[] = [];
    for (const [categoryId, { categoryName, type, data }] of categoryMap) {
        const months: HeatmapCell[] = [];
        for (let m = 1; m <= 12; m++) {
            const amount = data.get(m) || 0;
            months.push({
                month: m,
                amount,
                intensity: maxAmount > 0 ? amount / maxAmount : 0,
            });
        }
        heatmapRows.push({
            categoryId,
            categoryName,
            type: type as "expense" | "investment",
            months,
        });
    }

    // Sort by total spending descending
    heatmapRows.sort((a, b) => {
        const totalA = a.months.reduce((s, m) => s + m.amount, 0);
        const totalB = b.months.reduce((s, m) => s + m.amount, 0);
        return totalB - totalA;
    });

    return { year, categories: heatmapRows, maxAmount };
}
