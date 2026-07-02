import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createBudget, getBudgets } from "@/lib/services/budget-service";
import { cacheGet, cacheInvalidateByTags, TTL } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const budgets = await cacheGet(`budgets:${userId}`, () => getBudgets(db, userId), {
            ttl: TTL.MEDIUM,
            tags: ["budgets", userId],
        });
        return Response.json({ data: budgets });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/budgets",
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
        const budget = await createBudget(db, session.user.id, body);
        cacheInvalidateByTags(["budgets", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: budget }, { status: 201 });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/budgets",
            method: "POST",
            userId: session.user.id,
        });
    }
}
