import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getCategoryTrends } from "@/lib/analytics/trends";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * GET /api/analytics/trends?startYear=2026&startMonth=1&endYear=2026&endMonth=6
 *
 * Returns category trends for the given date range.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const startYear = Number(searchParams.get("startYear"));
    const startMonth = Number(searchParams.get("startMonth"));
    const endYear = Number(searchParams.get("endYear"));
    const endMonth = Number(searchParams.get("endMonth"));

    if ([startYear, startMonth, endYear, endMonth].some(isNaN)) {
        return Response.json(
            { error: "startYear, startMonth, endYear, endMonth are required" },
            { status: 400 }
        );
    }

    try {
        const trends = await getCategoryTrends(
            db,
            session.user.id,
            startYear,
            startMonth,
            endYear,
            endMonth
        );
        return Response.json({ data: trends });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/analytics/trends",
            method: "GET",
            userId: session.user.id,
        });
    }
}
