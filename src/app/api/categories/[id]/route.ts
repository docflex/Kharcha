import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getCategoryById, updateCategory, deleteCategory } from "@/lib/services/category-service";
import { cacheInvalidateByTags } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const category = await getCategoryById(db, session.user.id, id);

        if (!category) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        return Response.json({ data: category });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/categories/[id]",
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
        const updated = await updateCategory(db, session.user.id, id, body);

        if (!updated) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        cacheInvalidateByTags(["categories", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: updated });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/categories/[id]",
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
        const deleted = await deleteCategory(db, session.user.id, id);

        if (!deleted) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }

        cacheInvalidateByTags(["categories", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ message: "Deleted" });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/categories/[id]",
            method: "DELETE",
            userId: session.user.id,
        });
    }
}
