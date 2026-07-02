import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { bulkUpdateExpenses } from "@/lib/services/expense-service";
import { bulkUpdateExpensesSchema } from "@/lib/utils/validators";
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
        const { ids, categoryId } = bulkUpdateExpensesSchema.parse(body);

        const count = await bulkUpdateExpenses(db, session.user.id, ids, {
            categoryId,
        });

        cacheInvalidateByTags(["expenses", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);

        return Response.json({ data: { updated: count } });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses/bulk-update",
            method: "POST",
            userId: session.user.id,
        });
    }
}
