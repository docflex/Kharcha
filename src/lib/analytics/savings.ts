import { eq, and, sum } from "drizzle-orm";
import { expenses, monthlyIncome, users } from "@/lib/db/schema";
import type { Db, SavingsResult } from "./types";

/**
 * Calculate savings for a specific month.
 * Income is sourced from monthly_income entries first, falling back to user's default_monthly_income.
 */
export async function calculateSavings(
    db: Db,
    userId: string,
    year: number,
    month: number
): Promise<SavingsResult> {
    // Get total income for the month
    const incomeRows = await db
        .select({ total: sum(monthlyIncome.amount) })
        .from(monthlyIncome)
        .where(
            and(
                eq(monthlyIncome.userId, userId),
                eq(monthlyIncome.year, year),
                eq(monthlyIncome.month, month)
            )
        );

    let totalIncome = Number(incomeRows[0]?.total) || 0;

    // Fallback to default monthly income if no entries exist
    if (totalIncome === 0) {
        const user = await db
            .select({ defaultMonthlyIncome: users.defaultMonthlyIncome })
            .from(users)
            .where(eq(users.id, userId));

        totalIncome = user?.[0]?.defaultMonthlyIncome || 0;
    }

    // Get total spending for the month
    const spendRows = await db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
            and(eq(expenses.userId, userId), eq(expenses.year, year), eq(expenses.month, month))
        );

    const totalSpend = Number(spendRows[0]?.total) || 0;

    const savings = totalIncome - totalSpend;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    return {
        year,
        month,
        totalIncome,
        totalSpend,
        savings,
        savingsRate,
    };
}
