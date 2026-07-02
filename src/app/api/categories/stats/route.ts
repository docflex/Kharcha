import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getCategoryStats } from "@/lib/services/category-service";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const stats = await cacheGet(
            `category-stats:${userId}`,
            () => getCategoryStats(db, userId),
            { ttl: TTL.SHORT, tags: ["categories", userId] }
        );
        return Response.json({ data: stats });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/categories/stats",
            method: "GET",
            userId,
        });
    }
}
