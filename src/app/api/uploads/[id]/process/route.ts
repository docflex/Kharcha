import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { processUpload, getUpload } from "@/lib/services/upload-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Verify upload belongs to user
        const upload = await getUpload(db, session.user.id, id);
        if (!upload) {
            return Response.json({ error: "Upload not found" }, { status: 404 });
        }

        if (upload.status !== "pending" && upload.status !== "processing") {
            return Response.json({ error: `Upload already ${upload.status}` }, { status: 400 });
        }

        // Run OCR pipeline with 60s timeout
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("OCR processing timed out after 60s")), 60000)
        );
        const result = await Promise.race([processUpload(db, id), timeout]);

        return Response.json({
            data: {
                entries: result.entries,
                totalConfidence: result.totalConfidence,
            },
        });
    } catch (error) {
        return handleApiError(error, {
            route: `/api/uploads/${id}/process`,
            method: "POST",
            userId: session.user.id,
        });
    }
}
