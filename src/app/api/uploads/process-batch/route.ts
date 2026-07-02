import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { processBatchUploads, getUpload } from "@/lib/services/upload-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const uploadIds: string[] = body.uploadIds;

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
        return Response.json({ error: "uploadIds array required" }, { status: 400 });
    }

    try {
        // Verify all uploads belong to user and are pending/processing
        for (const id of uploadIds) {
            const upload = await getUpload(db, session.user.id, id);
            if (!upload) {
                return Response.json({ error: `Upload ${id} not found` }, { status: 404 });
            }
            if (upload.status !== "pending" && upload.status !== "processing") {
                return Response.json(
                    { error: `Upload ${id} already ${upload.status}` },
                    { status: 400 }
                );
            }
        }

        // Run batch OCR pipeline with deduplication (120s timeout for batch)
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Batch OCR processing timed out after 120s")), 120000)
        );
        const result = await Promise.race([processBatchUploads(db, uploadIds), timeout]);

        return Response.json({
            data: {
                entries: result.entries,
                totalConfidence: result.totalConfidence,
                imageResults: result.imageResults.map((r) => ({
                    filename: r.filename,
                    entryCount: r.entries.length,
                    rawText: r.rawText,
                })),
            },
        });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/uploads/process-batch",
            method: "POST",
            userId: session.user.id,
        });
    }
}
