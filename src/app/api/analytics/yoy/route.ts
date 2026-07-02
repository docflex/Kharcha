import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getYoYComparison } from "@/lib/analytics/yoy";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * GET /api/analytics/yoy?month=6
 *
 * Returns same-month spending across all available years for YoY comparison.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monthParam = request.nextUrl.searchParams.get("month");
    if (!monthParam) {
        return Response.json({ error: "month is required" }, { status: 400 });
    }

    const month = Number(monthParam);
    if (isNaN(month) || month < 1 || month > 12) {
        return Response.json({ error: "Invalid month (1-12)" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        const data = await cacheGet(
            `yoy:${userId}:${month}`,
            () => getYoYComparison(db, userId, month),
            { ttl: TTL.SHORT, tags: ["analytics", userId] }
        );
        return Response.json({ data });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/analytics/yoy",
            method: "GET",
            userId,
        });
    }
}
