// @vitest-environment node
/**
 * TRUE End-to-End Upload Integration Test
 *
 * Exercises the FULL data flow with real screenshots:
 *   1. In-memory SQLite DB (test isolation)
 *   2. Seed user + categories
 *   3. createUpload() — persist upload record
 *   4. processUpload() — real OCR on actual screenshots
 *   5. Verify extracted data in DB
 *   6. commitUpload() — write expenses to DB
 *   7. Verify expenses persisted correctly
 *
 * Also tests: processBatchUploads, getUploads, getUpload, error paths.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql, eq } from "drizzle-orm";
import path from "path";
import * as schema from "@/lib/db/schema";
import {
    createUpload,
    processUpload,
    processBatchUploads,
    commitUpload,
    getUploads,
    getUpload,
} from "@/lib/services/upload-service";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

const SCREENSHOTS_DIR = path.resolve(__dirname, "../fixtures/screenshots");

// ─── Test DB Setup ──────────────────────────────────────────────────────────

async function createTestDb() {
    const client = new PGlite();
    const db = drizzle(client, { schema });

    // Create all tables
    await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified TIMESTAMP,
      password_hash TEXT,
      image TEXT,
      default_monthly_income DOUBLE PRECISION,
      preferred_currency TEXT DEFAULT 'INR',
      password_changed_at TIMESTAMP,
      data_version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      type TEXT NOT NULL DEFAULT 'expense',
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_idx ON categories(user_id, name);

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence DOUBLE PRECISION,
      notes TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      raw_ocr_text TEXT,
      extracted_data TEXT,
      processed_at TIMESTAMP,
      committed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL
    );
  `);

    return { db, client };
}

const TEST_USER_ID = "test-user-e2e";
const TEST_USER = {
    id: TEST_USER_ID,
    name: "Test User",
    email: "test@example.com",
};

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let categoryMap: Map<string, string>; // name → id

beforeAll(async () => {
    testDb = await createTestDb();

    // Seed test user
    await testDb.db.insert(schema.users).values({
        ...TEST_USER,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Seed categories
    categoryMap = new Map();
    for (const cat of DEFAULT_CATEGORIES) {
        const id = `cat-${cat.name.toLowerCase().replace(/\s+/g, "-")}`;
        await testDb.db.insert(schema.categories).values({
            id,
            userId: TEST_USER_ID,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
            createdAt: new Date(),
        });
        categoryMap.set(cat.name, id);
    }
});

afterAll(async () => {
    await testDb.client.close();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Upload E2E — Full Pipeline with Real Screenshots", () => {
    describe("Single Upload Lifecycle", () => {
        let uploadId: string;

        it("Step 1: createUpload — persists upload record", async () => {
            const upload = await createUpload(testDb.db, TEST_USER_ID, {
                year: 2025,
                month: 12,
                filename: "IMG_2806.PNG",
                filePath: path.join(SCREENSHOTS_DIR, "IMG_2806.PNG"),
            });

            uploadId = upload.id;

            expect(upload.id).toBeTruthy();
            expect(upload.status).toBe("pending");
            expect(upload.filename).toBe("IMG_2806.PNG");
            expect(upload.year).toBe(2025);
            expect(upload.month).toBe(12);

            // Verify it's in the DB
            const fromDb = await getUpload(testDb.db, TEST_USER_ID, uploadId);
            expect(fromDb).toBeDefined();
            expect(fromDb!.status).toBe("pending");
        });

        it("Step 2: processUpload — runs real OCR on IMG_2806.PNG", async () => {
            const result = await processUpload(testDb.db, uploadId);

            // Should have extracted entries from the real screenshot
            expect(result.entries.length).toBeGreaterThanOrEqual(5);
            expect(result.totalConfidence).toBeGreaterThan(0);

            // Verify some known categories from IMG_2806
            const categories = result.entries.map((e) => e.category.toLowerCase());
            const expectedCategories = ["investments", "rent", "food", "groceries", "flight"];
            let foundCount = 0;
            for (const expected of expectedCategories) {
                if (categories.some((c) => c.includes(expected))) {
                    foundCount++;
                }
            }
            expect(foundCount).toBeGreaterThanOrEqual(3);

            // Verify DB status updated to "review"
            const fromDb = await getUpload(testDb.db, TEST_USER_ID, uploadId);
            expect(fromDb!.status).toBe("review");
            expect(fromDb!.rawOcrText).toBeTruthy();
            expect(fromDb!.extractedData).toBeTruthy();
            expect(fromDb!.processedAt).toBeTruthy();

            // Verify extractedData is valid JSON
            const parsed = JSON.parse(fromDb!.extractedData!);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBeGreaterThanOrEqual(5);
        }, 30000);

        it("Step 3: commitUpload — saves entries as expenses to DB", async () => {
            // Get the processed entries from DB
            const upload = await getUpload(testDb.db, TEST_USER_ID, uploadId);
            const entries = JSON.parse(upload!.extractedData!);

            // Map entries to commit format (using first matching category ID)
            const commitEntries = entries
                .slice(0, 5)
                .map((e: { category: string; amount: number; confidence: number }) => {
                    const catId = categoryMap.get(e.category) || categoryMap.get("Miscellaneous")!;
                    return {
                        categoryId: catId,
                        amount: e.amount,
                        confidence: e.confidence,
                    };
                });

            await commitUpload(testDb.db, TEST_USER_ID, uploadId, commitEntries);

            // Verify upload status is now "committed"
            const committed = await getUpload(testDb.db, TEST_USER_ID, uploadId);
            expect(committed!.status).toBe("committed");
            expect(committed!.committedAt).toBeTruthy();

            // Verify expenses were created in DB
            const expensesInDb = await testDb.db
                .select()
                .from(schema.expenses)
                .where(eq(schema.expenses.userId, TEST_USER_ID));

            expect(expensesInDb.length).toBe(5);
            for (const expense of expensesInDb) {
                expect(expense.userId).toBe(TEST_USER_ID);
                expect(expense.year).toBe(2025);
                expect(expense.month).toBe(12);
                expect(expense.source).toBe("ocr");
                expect(expense.amount).toBeGreaterThan(0);
                expect(expense.confidence).toBeGreaterThan(0);
            }
        });
    });

    describe("Batch Upload Lifecycle", () => {
        let batchUploadIds: string[];

        it("Step 1: creates multiple upload records", async () => {
            const uploads = [];
            for (const filename of ["IMG_2811.PNG", "IMG_2812.PNG"]) {
                const upload = await createUpload(testDb.db, TEST_USER_ID, {
                    year: 2026,
                    month: 1,
                    filename,
                    filePath: path.join(SCREENSHOTS_DIR, filename),
                });
                uploads.push(upload);
            }

            batchUploadIds = uploads.map((u) => u.id);
            expect(batchUploadIds.length).toBe(2);
        });

        it("Step 2: processBatchUploads — OCR on 2 real screenshots with dedup", async () => {
            const result = await processBatchUploads(testDb.db, batchUploadIds);

            // Should have deduplicated entries
            expect(result.entries.length).toBeGreaterThanOrEqual(3);

            // Each category should appear only once (dedup)
            const catNames = result.entries.map((e) => e.category.toLowerCase());
            expect(new Set(catNames).size).toBe(catNames.length);

            // Both uploads should be in "review" status
            for (const id of batchUploadIds) {
                const upload = await getUpload(testDb.db, TEST_USER_ID, id);
                expect(upload!.status).toBe("review");
                expect(upload!.rawOcrText).toBeTruthy();
            }

            // imageResults should have one per input
            expect(result.imageResults.length).toBe(2);
            expect(result.totalConfidence).toBeGreaterThan(0);
        }, 60000);
    });

    describe("Error Handling", () => {
        it("processUpload fails for non-existent upload", async () => {
            await expect(processUpload(testDb.db, "non-existent-id")).rejects.toThrow(
                "Upload not found"
            );
        });

        it("commitUpload fails if upload is not in review status", async () => {
            // Create a new upload (status = pending)
            const upload = await createUpload(testDb.db, TEST_USER_ID, {
                year: 2026,
                month: 2,
                filename: "test.png",
                filePath: "/tmp/nonexistent.png",
            });

            await expect(
                commitUpload(testDb.db, TEST_USER_ID, upload.id, [
                    { categoryId: "cat-rent", amount: 1000, confidence: 0.9 },
                ])
            ).rejects.toThrow("expected 'review'");
        });

        it("commitUpload fails for wrong user", async () => {
            // Try to commit someone else's upload
            const upload = await createUpload(testDb.db, TEST_USER_ID, {
                year: 2026,
                month: 3,
                filename: "test2.png",
                filePath: "/tmp/nonexistent2.png",
            });

            await expect(
                commitUpload(testDb.db, "wrong-user-id", upload.id, [
                    { categoryId: "cat-rent", amount: 1000, confidence: 0.9 },
                ])
            ).rejects.toThrow("Upload not found");
        });
    });

    describe("Query & Retrieval", () => {
        it("getUploads returns all uploads for user", async () => {
            const uploads = await getUploads(testDb.db, TEST_USER_ID);
            expect(uploads.length).toBeGreaterThanOrEqual(4); // at least 4 created above
        });

        it("getUploads filters by year and month", async () => {
            const uploads = await getUploads(testDb.db, TEST_USER_ID, {
                year: 2025,
                month: 12,
            });
            expect(uploads.length).toBeGreaterThanOrEqual(1);
            for (const u of uploads) {
                expect(u.year).toBe(2025);
                expect(u.month).toBe(12);
            }
        });

        it("getUploads filters by status", async () => {
            const committed = await getUploads(testDb.db, TEST_USER_ID, {
                status: "committed",
            });
            expect(committed.length).toBeGreaterThanOrEqual(1);
            for (const u of committed) {
                expect(u.status).toBe("committed");
            }
        });

        it("getUpload returns undefined for non-existent upload", async () => {
            const result = await getUpload(testDb.db, TEST_USER_ID, "fake-id");
            expect(result).toBeUndefined();
        });

        it("getUpload returns undefined for wrong user", async () => {
            const uploads = await getUploads(testDb.db, TEST_USER_ID);
            const firstId = uploads[0].id;

            const result = await getUpload(testDb.db, "wrong-user", firstId);
            expect(result).toBeUndefined();
        });
    });
});
