import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { expenses, monthlyIncome } from "@/lib/db/schema";
import { eq, and, or, sum } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { cacheGet, TTL } from "@/lib/cache";

/**
 * GET /api/analytics/sparkline?months=6&year=2025&month=7
 *
 * Returns monthly totals for expenses and income for the last N months
 * ending at the given year/month (defaults to current month).
 * Used for sparkline mini-charts on the dashboard.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monthCount = Math.min(Number(request.nextUrl.searchParams.get("months") || "6"), 12);

    const now = new Date();
    const endYear = Number(request.nextUrl.searchParams.get("year") || now.getFullYear());
    const endMonth = Number(request.nextUrl.searchParams.get("month") || now.getMonth() + 1);

    const points: { year: number; month: number }[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(endYear, endMonth - 1 - i, 1);
        points.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const userId = session.user.id;
    const cacheKey = `sparkline:${userId}:${monthCount}:${endYear}:${endMonth}`;

    const data = await cacheGet(
        cacheKey,
        async () => {
            // Build OR conditions for all month/year pairs
            const monthFilters = points.map((p) =>
                and(eq(expenses.year, p.year), eq(expenses.month, p.month))
            );
            const incomeFilters = points.map((p) =>
                and(eq(monthlyIncome.year, p.year), eq(monthlyIncome.month, p.month))
            );

            // 2 queries instead of 12
            const [expRows, incRows] = await Promise.all([
                db
                    .select({
                        year: expenses.year,
                        month: expenses.month,
                        total: sum(expenses.amount),
                    })
                    .from(expenses)
                    .where(and(eq(expenses.userId, userId), or(...monthFilters)))
                    .groupBy(expenses.year, expenses.month),
                db
                    .select({
                        year: monthlyIncome.year,
                        month: monthlyIncome.month,
                        total: sum(monthlyIncome.amount),
                    })
                    .from(monthlyIncome)
                    .where(and(eq(monthlyIncome.userId, userId), or(...incomeFilters)))
                    .groupBy(monthlyIncome.year, monthlyIncome.month),
            ]);

            // Map results back to ordered arrays
            const expMap = new Map(
                expRows.map((r) => [`${r.year}-${r.month}`, Number(r.total) || 0])
            );
            const incMap = new Map(
                incRows.map((r) => [`${r.year}-${r.month}`, Number(r.total) || 0])
            );

            return {
                months: points.map((p) => `${p.year}-${String(p.month).padStart(2, "0")}`),
                expenses: points.map((p) => expMap.get(`${p.year}-${p.month}`) || 0),
                income: points.map((p) => incMap.get(`${p.year}-${p.month}`) || 0),
            };
        },
        { ttl: TTL.MEDIUM, tags: ["sparkline", userId] }
    );

    return Response.json({ data });
}
