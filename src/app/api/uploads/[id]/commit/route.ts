import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { commitUpload, getUpload } from "@/lib/services/upload-service";
import { resolveCategoryIds } from "@/lib/services/category-service";
import { cacheInvalidateByTags } from "@/lib/cache";
import { bumpDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Verify upload belongs to user and is in review state
        const upload = await getUpload(db, session.user.id, id);
        if (!upload) {
            return Response.json({ error: "Upload not found" }, { status: 404 });
        }

        if (upload.status !== "review") {
            return Response.json(
                { error: `Upload status is '${upload.status}', expected 'review'` },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { entries } = body;

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return Response.json({ error: "At least one entry required" }, { status: 400 });
        }

        // Resolve category names to IDs (create missing categories on the fly)
        const resolvedEntries = await resolveCategoryIds(
            db,
            session.user.id,
            entries.map((e: { categoryId: string; amount: number; confidence: number }) => ({
                categoryName: e.categoryId, // Client sends name as "categoryId"
                amount: e.amount,
                confidence: e.confidence,
            }))
        );

        await commitUpload(db, session.user.id, id, resolvedEntries);

        cacheInvalidateByTags(["expenses", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["categories", session.user.id]);
        cacheInvalidateByTags(["snapshot", session.user.id]);
        await bumpDataVersion(db, session.user.id);
        return Response.json({ data: { committed: true } });
    } catch (error) {
        return handleApiError(error, {
            route: `/api/uploads/${id}/commit`,
            method: "POST",
            userId: session.user.id,
        });
    }
}
