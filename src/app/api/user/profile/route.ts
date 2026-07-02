import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getProfile, updateProfile } from "@/lib/services/user-service";
import { updateProfileSchema } from "@/lib/utils/validators";
import { cacheGet, cacheInvalidateByTags, TTL } from "@/lib/cache";
import { logAuditAction } from "@/lib/services/audit-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const profile = await cacheGet(`profile:${userId}`, () => getProfile(db, userId), {
            ttl: TTL.MEDIUM,
            tags: ["profile", userId],
        });
        if (!profile) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }
        return Response.json({ data: profile });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/user/profile",
            method: "GET",
            userId: session.user.id,
        });
    }
}

export async function PATCH(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const body = await request.json();
        const parsed = updateProfileSchema.parse(body);

        const updated = await updateProfile(db, userId, parsed);
        if (!updated) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }
        cacheInvalidateByTags(["profile", userId]);
        await logAuditAction(
            db,
            userId,
            "profile_update",
            parsed,
            request.headers.get("x-forwarded-for") || undefined
        );
        return Response.json({ data: updated });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/user/profile",
            method: "PATCH",
            userId: session.user.id,
        });
    }
}
