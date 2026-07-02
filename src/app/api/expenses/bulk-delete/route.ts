import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { bulkDeleteExpenses } from "@/lib/services/expense-service";
import { bulkDeleteExpensesSchema } from "@/lib/utils/validators";
import { cacheInvalidateByTags } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { ids } = bulkDeleteExpensesSchema.parse(body);

        const count = await bulkDeleteExpenses(db, session.user.id, ids);

        cacheInvalidateByTags(["expenses", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);

        return Response.json({ data: { deleted: count } });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses/bulk-delete",
            method: "POST",
            userId: session.user.id,
        });
    }
}
