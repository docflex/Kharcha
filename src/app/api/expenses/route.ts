import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createExpense, getExpenses } from "@/lib/services/expense-service";
import { cacheGet, cacheInvalidateByTags, TTL } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const userId = session.user.id;

    try {
        const expenses = await cacheGet(
            `expenses:${userId}:${year || "all"}:${month || "all"}:${categoryId || "all"}`,
            () => getExpenses(db, userId, { year, month, categoryId }),
            { ttl: TTL.SHORT, tags: ["expenses", userId] }
        );
        return Response.json({ data: expenses });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses",
            method: "GET",
            userId: session.user.id,
        });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const expense = await createExpense(db, session.user.id, body);
        cacheInvalidateByTags(["expenses", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: expense }, { status: 201 });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses",
            method: "POST",
            userId: session.user.id,
        });
    }
}
