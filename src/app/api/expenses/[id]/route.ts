import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getExpenseById, updateExpense, deleteExpense } from "@/lib/services/expense-service";
import { cacheInvalidateByTags } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const expense = await getExpenseById(db, session.user.id, id);

        if (!expense) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        return Response.json({ data: expense });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses/[id]",
            method: "GET",
            userId: session.user.id,
        });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const updated = await updateExpense(db, session.user.id, id, body);

        if (!updated) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        cacheInvalidateByTags(["expenses", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: updated });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses/[id]",
            method: "PATCH",
            userId: session.user.id,
        });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const deleted = await deleteExpense(db, session.user.id, id);

        if (!deleted) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        cacheInvalidateByTags(["expenses", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ message: "Deleted" });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/expenses/[id]",
            method: "DELETE",
            userId: session.user.id,
        });
    }
}
