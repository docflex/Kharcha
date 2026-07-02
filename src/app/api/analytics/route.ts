import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getMonthSummary, getMoMComparison } from "@/lib/analytics/mom";
import { calculateSavings } from "@/lib/analytics/savings";
import { getBudgetOverview } from "@/lib/analytics/budget";
import { getTopCategories } from "@/lib/analytics/trends";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * GET /api/analytics?year=2026&month=6
 *
 * Returns a combined analytics payload for the dashboard:
 * - month summary (totals, per-category)
 * - MoM comparison
 * - savings
 * - budget overview
 * - top categories
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!yearParam || !monthParam) {
        return Response.json({ error: "year and month are required" }, { status: 400 });
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return Response.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        const data = await cacheGet(
            `analytics:${userId}:${year}:${month}`,
            async () => {
                const [summary, mom, savings, budgetOverview, topCategories] = await Promise.all([
                    getMonthSummary(db, userId, year, month),
                    getMoMComparison(db, userId, year, month),
                    calculateSavings(db, userId, year, month),
                    getBudgetOverview(db, userId, year, month),
                    getTopCategories(db, userId, year, month, 10),
                ]);
                return { summary, mom, savings, budgetOverview, topCategories };
            },
            { ttl: TTL.SHORT, tags: ["analytics", userId] }
        );

        return Response.json({ data });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/analytics",
            method: "GET",
            userId: session.user.id,
        });
    }
}
