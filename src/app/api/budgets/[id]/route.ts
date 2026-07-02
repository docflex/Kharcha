import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { updateBudget, deleteBudget } from "@/lib/services/budget-service";
import { cacheInvalidateByTags } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const updated = await updateBudget(db, session.user.id, id, body);

        if (!updated) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        cacheInvalidateByTags(["budgets", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: updated });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/budgets/[id]",
            method: "PATCH",
            userId: session.user.id,
        });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const deleted = await deleteBudget(db, session.user.id, id);

        if (!deleted) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        cacheInvalidateByTags(["budgets", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ message: "Deleted" });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/budgets/[id]",
            method: "DELETE",
            userId: session.user.id,
        });
    }
}
