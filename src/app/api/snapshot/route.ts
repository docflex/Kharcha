import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getExpenses } from "@/lib/services/expense-service";
import { getIncome } from "@/lib/services/income-service";
import { getCategories } from "@/lib/services/category-service";
import { getBudgets } from "@/lib/services/budget-service";
import { getDataVersion } from "@/lib/services/version-service";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const year = Number(searchParams.get("year") || new Date().getFullYear());

    if (!year || year < 2000 || year > 2100) {
        return Response.json({ error: "Valid year required" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        const snapshot = await cacheGet(
            `snapshot:${userId}:${year}`,
            async () => {
                const [expenses, income, categories, budgets, version] = await Promise.all([
                    getExpenses(db, userId, { year }),
                    getIncome(db, userId, { year }),
                    getCategories(db, userId),
                    getBudgets(db, userId),
                    getDataVersion(db, userId),
                ]);

                return {
                    year,
                    version,
                    expenses,
                    income,
                    categories,
                    budgets,
                };
            },
            { ttl: TTL.LONG, tags: ["snapshot", userId, String(year)] }
        );

        return Response.json({ data: snapshot });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/snapshot",
            method: "GET",
            userId,
        });
    }
}
