import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getCategoryHeatmap } from "@/lib/analytics/heatmap";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * GET /api/analytics/heatmap?year=2026
 *
 * Returns a 12-month × N-category heatmap grid with intensity values.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const yearParam = request.nextUrl.searchParams.get("year");
    if (!yearParam) {
        return Response.json({ error: "year is required" }, { status: 400 });
    }

    const year = Number(yearParam);
    if (isNaN(year)) {
        return Response.json({ error: "Invalid year" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        const data = await cacheGet(
            `heatmap:${userId}:${year}`,
            () => getCategoryHeatmap(db, userId, year),
            { ttl: TTL.SHORT, tags: ["analytics", userId] }
        );
        return Response.json({ data });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/analytics/heatmap",
            method: "GET",
            userId,
        });
    }
}
