import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getCategoryDeepDive } from "@/lib/analytics/category-deepdive";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * GET /api/analytics/category/[id]
 *
 * Returns full historical deep-dive for a single category:
 * trend line, budget adherence, stats (avg/min/max/stddev), anomaly flags.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    try {
        const data = await cacheGet(
            `category-deepdive:${userId}:${id}`,
            () => getCategoryDeepDive(db, userId, id),
            { ttl: TTL.SHORT, tags: ["analytics", userId] }
        );

        if (!data) {
            return Response.json({ error: "Category not found" }, { status: 404 });
        }

        return Response.json({ data });
    } catch (error) {
        return handleApiError(error, {
            route: `/api/analytics/category/${id}`,
            method: "GET",
            userId,
        });
    }
}
