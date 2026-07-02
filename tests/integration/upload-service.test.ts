import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { createUpload, commitUpload, getUpload, getUploads } from "@/lib/services/upload-service";
import { getExpenses } from "@/lib/services/expense-service";
import { uploads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Tests for the upload service — create, status transitions, commit, isolation.
 * Does NOT test OCR (processUpload) since that needs real images.
 */
describe("Upload Service — Edge Cases", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let catFood: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        catFood = await seedTestCategory(db, userId, { name: "Food" });
    });

    afterEach(async () => await cleanup());

    describe("createUpload", () => {
        it("creates an upload record with pending status", async () => {
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "IMG_2806.PNG",
                filePath: "/tmp/test/IMG_2806.PNG",
            });

            expect(upload.id).toBeDefined();
            expect(upload.status).toBe("pending");
            expect(upload.year).toBe(2026);
            expect(upload.month).toBe(7);
            expect(upload.filename).toBe("IMG_2806.PNG");
            expect(upload.userId).toBe(userId);
        });

        it("creates multiple uploads", async () => {
            await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "a.png",
                filePath: "/tmp/a.png",
            });
            await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "b.png",
                filePath: "/tmp/b.png",
            });

            const all = await getUploads(db, userId);
            expect(all).toHaveLength(2);
        });
    });

    describe("getUpload", () => {
        it("returns upload by id", async () => {
            const created = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });

            const found = await getUpload(db, userId, created.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(created.id);
        });

        it("returns undefined for non-existent id", async () => {
            const found = await getUpload(db, userId, "nonexistent");
            expect(found).toBeUndefined();
        });

        it("returns undefined for other user's upload", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });

            const found = await getUpload(db, userB, upload.id);
            expect(found).toBeUndefined();
        });
    });

    describe("getUploads — filtering", () => {
        beforeEach(async () => {
            const u1 = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "jul1.png",
                filePath: "/tmp/jul1.png",
            });
            await createUpload(db, userId, {
                year: 2026,
                month: 8,
                filename: "aug1.png",
                filePath: "/tmp/aug1.png",
            });
            // Manually set one to 'review' status
            await db.update(uploads).set({ status: "review" }).where(eq(uploads.id, u1.id));
        });

        it("filters by year", async () => {
            const r = await getUploads(db, userId, { year: 2026 });
            expect(r).toHaveLength(2);
        });

        it("filters by month", async () => {
            const r = await getUploads(db, userId, { year: 2026, month: 7 });
            expect(r).toHaveLength(1);
            expect(r[0].filename).toBe("jul1.png");
        });

        it("filters by status", async () => {
            const pending = await getUploads(db, userId, { status: "pending" });
            expect(pending).toHaveLength(1);
            expect(pending[0].filename).toBe("aug1.png");

            const review = await getUploads(db, userId, { status: "review" });
            expect(review).toHaveLength(1);
            expect(review[0].filename).toBe("jul1.png");
        });

        it("returns empty for non-matching filters", async () => {
            const r = await getUploads(db, userId, { year: 2020 });
            expect(r).toHaveLength(0);
        });
    });

    describe("commitUpload", () => {
        it("creates expenses and transitions status to committed", async () => {
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });

            // Manually set to 'review' status (normally done by processUpload)
            await db.update(uploads).set({ status: "review" }).where(eq(uploads.id, upload.id));

            await commitUpload(db, userId, upload.id, [
                { categoryId: catFood, amount: 5000, confidence: 0.95 },
                { categoryId: catFood, amount: 2500, confidence: 0.87 },
            ]);

            // Verify upload status changed
            const committed = await getUpload(db, userId, upload.id);
            expect(committed!.status).toBe("committed");

            // Verify expenses were created
            const expenses = await getExpenses(db, userId, { year: 2026, month: 7 });
            expect(expenses).toHaveLength(2);
            expect(expenses.map((e) => e.amount).sort()).toEqual([2500, 5000]);
            expect(expenses[0].source).toBe("ocr");
        });

        it("throws for non-existent upload", async () => {
            await expect(
                commitUpload(db, userId, "nonexistent", [
                    { categoryId: catFood, amount: 100, confidence: 0.9 },
                ])
            ).rejects.toThrow("Upload not found");
        });

        it("throws when upload is not in review status", async () => {
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });

            // Status is still 'pending'
            await expect(
                commitUpload(db, userId, upload.id, [
                    { categoryId: catFood, amount: 100, confidence: 0.9 },
                ])
            ).rejects.toThrow("expected 'review'");
        });

        it("throws when another user tries to commit", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });

            await db.update(uploads).set({ status: "review" }).where(eq(uploads.id, upload.id));

            await expect(
                commitUpload(db, userB, upload.id, [
                    { categoryId: catFood, amount: 100, confidence: 0.9 },
                ])
            ).rejects.toThrow("Upload not found");
        });

        it("commits empty entries list (no expenses created)", async () => {
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });

            await db.update(uploads).set({ status: "review" }).where(eq(uploads.id, upload.id));

            await commitUpload(db, userId, upload.id, []);

            const committed = await getUpload(db, userId, upload.id);
            expect(committed!.status).toBe("committed");

            const expenses = await getExpenses(db, userId, { year: 2026, month: 7 });
            expect(expenses).toHaveLength(0);
        });
    });
});
