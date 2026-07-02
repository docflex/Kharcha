import { eq, and, desc } from "drizzle-orm";
import { uploads, expenses } from "../db/schema";
import { processImage, processBatch } from "../ocr/pipeline";
import type { BatchResult } from "../ocr/types";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

// ─── Create Upload Record ───────────────────────────────────────────────────

export async function createUpload(
    db: DB,
    userId: string,
    data: {
        year: number;
        month: number;
        filename: string;
        filePath: string;
    }
): Promise<typeof uploads.$inferSelect> {
    const id = crypto.randomUUID();

    const [upload] = await db
        .insert(uploads)
        .values({
            id,
            userId,
            year: data.year,
            month: data.month,
            filename: data.filename,
            filePath: data.filePath,
            status: "pending",
        })
        .returning();

    return upload;
}

// ─── Process Upload (OCR Pipeline) ──────────────────────────────────────────

export async function processUpload(db: DB, uploadId: string): Promise<BatchResult> {
    // Get the upload record
    const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
    });

    if (!upload) {
        throw new Error("Upload not found");
    }

    // Mark as processing
    await db.update(uploads).set({ status: "processing" }).where(eq(uploads.id, uploadId));

    try {
        // Run OCR pipeline on the image
        const result = await processImage(upload.filePath, upload.filename);

        // Store results
        await db
            .update(uploads)
            .set({
                status: "review",
                rawOcrText: result.rawText,
                extractedData: JSON.stringify(result.entries),
                processedAt: new Date(),
            })
            .where(eq(uploads.id, uploadId));

        return {
            entries: result.entries.map((e) => ({
                ...e,
                conflict: false,
            })),
            imageResults: [result],
            totalConfidence:
                result.entries.length > 0
                    ? result.entries.reduce((sum, e) => sum + e.confidence, 0) /
                      result.entries.length
                    : 0,
        };
    } catch (error) {
        await db.update(uploads).set({ status: "failed" }).where(eq(uploads.id, uploadId));
        throw error;
    }
}

// ─── Process Batch (Multiple Uploads) ───────────────────────────────────────

export async function processBatchUploads(db: DB, uploadIds: string[]): Promise<BatchResult> {
    const uploadRecords = [];
    for (const id of uploadIds) {
        const upload = await db.query.uploads.findFirst({
            where: eq(uploads.id, id),
        });
        if (!upload) throw new Error(`Upload ${id} not found`);
        uploadRecords.push(upload);
    }

    // Mark all as processing
    for (const upload of uploadRecords) {
        await db.update(uploads).set({ status: "processing" }).where(eq(uploads.id, upload.id));
    }

    try {
        const result = await processBatch(
            uploadRecords.map((u) => u.filePath),
            uploadRecords.map((u) => u.filename)
        );

        // Store results on each upload
        for (let i = 0; i < uploadRecords.length; i++) {
            const imgResult = result.imageResults[i];
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

        return result;
    } catch (error) {
        for (const upload of uploadRecords) {
            await db.update(uploads).set({ status: "failed" }).where(eq(uploads.id, upload.id));
        }
        throw error;
    }
}

// ─── Commit Upload (Save to Expenses) ───────────────────────────────────────

export async function commitUpload(
    db: DB,
    userId: string,
    uploadId: string,
    entries: Array<{
        categoryId: string;
        amount: number;
        confidence: number;
    }>
): Promise<void> {
    const upload = await db.query.uploads.findFirst({
        where: and(eq(uploads.id, uploadId), eq(uploads.userId, userId)),
    });

    if (!upload) throw new Error("Upload not found");
    if (upload.status !== "review") {
        throw new Error(`Upload status is '${upload.status}', expected 'review'`);
    }

    // Insert expenses
    for (const entry of entries) {
        await db.insert(expenses).values({
            id: crypto.randomUUID(),
            userId,
            categoryId: entry.categoryId,
            year: upload.year,
            month: upload.month,
            amount: entry.amount,
            source: "ocr",
            confidence: entry.confidence,
        });
    }

    // Mark upload as committed
    await db
        .update(uploads)
        .set({
            status: "committed",
            committedAt: new Date(),
        })
        .where(eq(uploads.id, uploadId));
}

// ─── Get Uploads ────────────────────────────────────────────────────────────

export async function getUploads(
    db: DB,
    userId: string,
    options?: { year?: number; month?: number; status?: string }
): Promise<Array<typeof uploads.$inferSelect>> {
    const conditions = [eq(uploads.userId, userId)];

    if (options?.year) conditions.push(eq(uploads.year, options.year));
    if (options?.month) conditions.push(eq(uploads.month, options.month));
    if (options?.status) {
        conditions.push(
            eq(
                uploads.status,
                options.status as "pending" | "processing" | "review" | "committed" | "failed"
            )
        );
    }

    return db.query.uploads.findMany({
        where: and(...conditions),
        orderBy: [desc(uploads.createdAt)],
    });
}

// ─── Get Single Upload ──────────────────────────────────────────────────────

export async function getUpload(
    db: DB,
    userId: string,
    uploadId: string
): Promise<typeof uploads.$inferSelect | undefined> {
    return db.query.uploads.findFirst({
        where: and(eq(uploads.id, uploadId), eq(uploads.userId, userId)),
    });
}
