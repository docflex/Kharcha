import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getAuditLog } from "@/lib/services/audit-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const logs = await getAuditLog(db, session.user.id, { limit: 50 });
        return Response.json({ data: logs });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/user/audit-log",
            method: "GET",
            userId: session.user.id,
        });
    }
}
