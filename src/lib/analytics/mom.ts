import { eq, and, sum } from "drizzle-orm";
import { expenses, categories } from "@/lib/db/schema";
import { getPreviousMonth } from "@/lib/utils/dates";
import type { Db, MonthSummary, MoMComparison, CategoryMoMChange, CategorySpend } from "./types";

/**
 * Get a summary of spending for a specific month.
 * Groups expenses by category and separates expenses vs investments.
 */
export async function getMonthSummary(
    db: Db,
    userId: string,
    year: number,
    month: number
): Promise<MonthSummary> {
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
        .groupBy(expenses.categoryId, categories.name, categories.type);

    const cats: CategorySpend[] = rows.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        amount: Number(r.totalAmount) || 0,
        type: r.categoryType as "expense" | "investment",
    }));

    const totalSpend = cats.reduce((sum, c) => sum + c.amount, 0);
    const totalInvestments = cats
        .filter((c) => c.type === "investment")
        .reduce((sum, c) => sum + c.amount, 0);

    return {
        year,
        month,
        totalSpend,
        totalInvestments,
        totalExpenses: totalSpend - totalInvestments,
        categories: cats,
    };
}

/**
 * Compare spending between the given month and the previous month.
 * Returns per-category changes + new/dropped categories.
 */
export async function getMoMComparison(
    db: Db,
    userId: string,
    year: number,
    month: number
): Promise<MoMComparison> {
    const prev = getPreviousMonth(month, year);

    const [current, previous] = await Promise.all([
        getMonthSummary(db, userId, year, month),
        getMonthSummary(db, userId, prev.year, prev.month),
    ]);

    const currentMap = new Map(current.categories.map((c) => [c.categoryId, c]));
    const previousMap = new Map(previous.categories.map((c) => [c.categoryId, c]));

    const allCategoryIds = new Set([...currentMap.keys(), ...previousMap.keys()]);

    const categoryChanges: CategoryMoMChange[] = [];
    const newCategories: string[] = [];
    const droppedCategories: string[] = [];

    for (const catId of allCategoryIds) {
        const cur = currentMap.get(catId);
        const prev = previousMap.get(catId);

        if (cur && !prev) {
            newCategories.push(cur.categoryName);
            categoryChanges.push({
                categoryId: catId,
                categoryName: cur.categoryName,
                currentAmount: cur.amount,
                previousAmount: 0,
                absoluteChange: cur.amount,
                percentChange: null,
            });
        } else if (!cur && prev) {
            droppedCategories.push(prev.categoryName);
            categoryChanges.push({
                categoryId: catId,
                categoryName: prev.categoryName,
                currentAmount: 0,
                previousAmount: prev.amount,
                absoluteChange: -prev.amount,
                percentChange: -100,
            });
        } else if (cur && prev) {
            const absoluteChange = cur.amount - prev.amount;
            const percentChange = prev.amount === 0 ? null : (absoluteChange / prev.amount) * 100;

            categoryChanges.push({
                categoryId: catId,
                categoryName: cur.categoryName,
                currentAmount: cur.amount,
                previousAmount: prev.amount,
                absoluteChange,
                percentChange,
            });
        }
    }

    const totalAbsoluteChange = current.totalSpend - previous.totalSpend;
    const totalPercentChange =
        previous.totalSpend === 0 ? null : (totalAbsoluteChange / previous.totalSpend) * 100;

    return {
        current: { year, month },
        previous: { year: prev.year, month: prev.month },
        totalCurrentSpend: current.totalSpend,
        totalPreviousSpend: previous.totalSpend,
        totalAbsoluteChange,
        totalPercentChange,
        categories: categoryChanges,
        newCategories,
        droppedCategories,
    };
}
