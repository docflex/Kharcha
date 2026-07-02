import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createCategory, getCategories } from "@/lib/services/category-service";
import { cacheGet, cacheInvalidateByTags, TTL } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") as "expense" | "investment" | null;

    const userId = session.user.id;

    try {
        const categories = await cacheGet(
            `categories:${userId}:${type || "all"}`,
            () => getCategories(db, userId, type ? { type } : undefined),
            { ttl: TTL.MEDIUM, tags: ["categories", userId] }
        );
        return Response.json({ data: categories });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/categories",
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
        const category = await createCategory(db, session.user.id, body);
        cacheInvalidateByTags(["categories", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: category }, { status: 201 });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/categories",
            method: "POST",
            userId: session.user.id,
        });
    }
}
