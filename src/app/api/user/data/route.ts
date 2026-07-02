import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { deleteAllUserData } from "@/lib/services/danger-zone-service";
import { logAuditAction } from "@/lib/services/audit-service";
import { cacheClear } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest } from "next/server";

export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await logAuditAction(
            db,
            session.user.id,
            "data_delete",
            undefined,
            request.headers.get("x-forwarded-for") || undefined
        );

        await deleteAllUserData(db, session.user.id);
        cacheClear();

        return Response.json({ message: "All data deleted successfully" });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/user/data",
            method: "DELETE",
            userId: session.user.id,
        });
    }
}
