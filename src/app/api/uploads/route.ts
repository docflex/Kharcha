import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createUpload, getUploads } from "@/lib/services/upload-service";
import { MAX_SCREENSHOTS_PER_BATCH } from "@/lib/constants";
import { processBatch } from "@/lib/ocr/pipeline";
import { uploads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateMagicBytes, sanitizeFilename } from "@/lib/utils/file-validation";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
    const status = searchParams.get("status") || undefined;

    try {
        const uploads = await getUploads(db, session.user.id, {
            year,
            month,
            status,
        });
        return Response.json({ data: uploads });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/uploads",
            method: "GET",
            userId: session.user.id,
        });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const year = Number(formData.get("year"));
        const month = Number(formData.get("month"));

        if (!files.length) {
            return Response.json({ error: "No files uploaded" }, { status: 400 });
        }

        if (files.length > MAX_SCREENSHOTS_PER_BATCH) {
            return Response.json(
                { error: `Maximum ${MAX_SCREENSHOTS_PER_BATCH} files per batch` },
                { status: 400 }
            );
        }

        if (!year || !month || month < 1 || month > 12) {
            return Response.json({ error: "Valid year and month required" }, { status: 400 });
        }

        // Validate file types and sizes
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                return Response.json(
                    { error: `File '${file.name}' is not an image` },
                    { status: 400 }
                );
            }
            if (file.size > MAX_FILE_SIZE) {
                return Response.json(
                    { error: `File '${file.name}' exceeds 10MB limit` },
                    { status: 400 }
                );
            }
        }

        // Read files as buffers (no disk writes)
        const buffers: Buffer[] = [];
        const filenames: string[] = [];
        const uploadRecords = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());

            // Validate magic bytes match claimed content-type
            if (!validateMagicBytes(buffer, file.type)) {
                return Response.json(
                    { error: `File '${file.name}' content does not match its type` },
                    { status: 400 }
                );
            }

            buffers.push(buffer);
            filenames.push(sanitizeFilename(file.name));

            const upload = await createUpload(db, session.user.id, {
                year,
                month,
                filename: file.name,
                filePath: "in-memory",
            });
            uploadRecords.push(upload);
        }

        // Run OCR immediately on buffers
        const result = await processBatch(buffers, filenames);

        // Update upload records with OCR results
        for (let i = 0; i < uploadRecords.length; i++) {
            const imgResult = result.imageResults[i];
            if (imgResult) {
                await db
                    .update(uploads)
                    .set({
                        status: "review",
                        rawOcrText: imgResult.rawText,
                        extractedData: JSON.stringify(imgResult.entries),
                        processedAt: new Date(),
                    })
                    .where(eq(uploads.id, uploadRecords[i].id));
            }
        }

        return Response.json(
            {
                data: uploadRecords,
                ocr: {
                    entries: result.entries,
                    totalConfidence: result.totalConfidence,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, {
            route: "/api/uploads",
            method: "POST",
            userId: session.user.id,
        });
    }
}
