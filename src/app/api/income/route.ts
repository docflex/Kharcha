import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createIncome, getIncome } from "@/lib/services/income-service";
import { createIncomeSchema } from "@/lib/utils/validators";
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

    const userId = session.user.id;

    try {
        const entries = await cacheGet(
            `income:${userId}:${year || "all"}:${month || "all"}`,
            () => getIncome(db, userId, { year, month }),
            { ttl: TTL.MEDIUM, tags: ["income", userId] }
        );
        return Response.json({ data: entries });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/income",
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
        const parsed = createIncomeSchema.parse(body);

        const entry = await createIncome(db, session.user.id, {
            year: parsed.year,
            month: parsed.month,
            amount: parsed.amount,
            source: (parsed.source || "salary").trim(),
        });

        cacheInvalidateByTags(["income", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: entry }, { status: 201 });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/income",
            method: "POST",
            userId: session.user.id,
        });
    }
}
