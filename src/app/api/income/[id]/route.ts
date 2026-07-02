import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { deleteIncome, updateIncome } from "@/lib/services/income-service";
import { updateIncomeSchema } from "@/lib/utils/validators";
import { cacheInvalidateByTags } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const parsed = updateIncomeSchema.parse(body);

        const entry = await updateIncome(db, session.user.id, id, parsed);
        if (!entry) {
            return Response.json({ error: "Income entry not found" }, { status: 404 });
        }
        cacheInvalidateByTags(["income", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: entry });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/income/[id]",
            method: "PATCH",
            userId: session.user.id,
        });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const deleted = await deleteIncome(db, session.user.id, id);
        if (!deleted) {
            return Response.json({ error: "Income entry not found" }, { status: 404 });
        }
        cacheInvalidateByTags(["income", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: { id } });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/income/[id]",
            method: "DELETE",
            userId: session.user.id,
        });
    }
}
