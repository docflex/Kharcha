import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { resolveCategoryIds, getCategories } from "@/lib/services/category-service";
import { createUpload, commitUpload } from "@/lib/services/upload-service";
import { getExpenses } from "@/lib/services/expense-service";
import { uploads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Tests the full commit flow: category name → ID resolution → expense insertion.
 * This was the root cause of the "FOREIGN KEY constraint failed" bug where
 * the UI sent category NAMES but the DB expected category IDs.
 */
describe("Commit Flow — resolveCategoryIds + commitUpload", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        // Seed some known categories
        await seedTestCategory(db, userId, { name: "Food" });
        await seedTestCategory(db, userId, { name: "Rent" });
        await seedTestCategory(db, userId, { name: "Investments", type: "investment" });
    });

    afterEach(async () => await cleanup());

    describe("resolveCategoryIds", () => {
        it("resolves existing category names to their IDs", async () => {
            const entries = [
                { categoryName: "Food", amount: 5000, confidence: 0.9 },
                { categoryName: "Rent", amount: 15000, confidence: 0.85 },
            ];

            const resolved = await resolveCategoryIds(db, userId, entries);

            expect(resolved).toHaveLength(2);
            // IDs should be UUIDs, not the names
            expect(resolved[0].categoryId).not.toBe("Food");
            expect(resolved[0].categoryId).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
            );
            expect(resolved[0].amount).toBe(5000);
            expect(resolved[1].amount).toBe(15000);
        });

        it("is case-insensitive when matching categories", async () => {
            const entries = [{ categoryName: "food", amount: 1000, confidence: 0.8 }];

            const resolved = await resolveCategoryIds(db, userId, entries);

            expect(resolved).toHaveLength(1);
            // Should match "Food" despite lowercase input
            const cats = await getCategories(db, userId);
            const foodCat = cats.find((c) => c.name === "Food");
            expect(resolved[0].categoryId).toBe(foodCat!.id);
        });

        it("creates missing categories on the fly", async () => {
            const entries = [{ categoryName: "Cinema", amount: 392, confidence: 0.73 }];

            const resolved = await resolveCategoryIds(db, userId, entries);

            expect(resolved).toHaveLength(1);

            // Verify the category was created in the DB
            const cats = await getCategories(db, userId);
            const cinema = cats.find((c) => c.name === "Cinema");
            expect(cinema).toBeDefined();
            expect(resolved[0].categoryId).toBe(cinema!.id);
        });

        it("reuses cached IDs for duplicate category names", async () => {
            const entries = [
                { categoryName: "NewCat", amount: 100, confidence: 0.9 },
                { categoryName: "NewCat", amount: 200, confidence: 0.8 },
            ];

            const resolved = await resolveCategoryIds(db, userId, entries);

            expect(resolved).toHaveLength(2);
            // Both should have the same categoryId
            expect(resolved[0].categoryId).toBe(resolved[1].categoryId);

            // Only one category should exist
            const cats = await getCategories(db, userId);
            const newCats = cats.filter((c) => c.name === "NewCat");
            expect(newCats).toHaveLength(1);
        });

        it("handles a mix of existing and new categories", async () => {
            const entries = [
                { categoryName: "Food", amount: 5000, confidence: 0.9 },
                { categoryName: "Shopping", amount: 387, confidence: 0.73 },
                { categoryName: "Rent", amount: 15000, confidence: 0.85 },
            ];

            const resolved = await resolveCategoryIds(db, userId, entries);

            expect(resolved).toHaveLength(3);
            // All should have valid UUIDs
            for (const entry of resolved) {
                expect(entry.categoryId).toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
                );
            }
        });

        it("preserves amount and confidence values", async () => {
            const entries = [{ categoryName: "Food", amount: 9824.8, confidence: 0.92 }];

            const resolved = await resolveCategoryIds(db, userId, entries);

            expect(resolved[0].amount).toBe(9824.8);
            expect(resolved[0].confidence).toBe(0.92);
        });
    });

    describe("Full commit flow (resolve → commit → expenses)", () => {
        it("commits OCR entries with resolved category IDs", async () => {
            // Create an upload record in "review" status
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });
            // Set status to "review" manually (normally done by processUpload)
            await db.update(uploads).set({ status: "review" }).where(eq(uploads.id, upload.id));

            // Simulate what the commit route does
            const rawEntries = [
                { categoryName: "Food", amount: 9824.8, confidence: 0.8 },
                { categoryName: "Rent", amount: 15000, confidence: 0.56 },
                { categoryName: "Cinema", amount: 392, confidence: 0.73 },
            ];

            const resolved = await resolveCategoryIds(db, userId, rawEntries);
            await commitUpload(db, userId, upload.id, resolved);

            // Verify expenses were created
            const expenses = await getExpenses(db, userId, { year: 2026, month: 7 });
            expect(expenses).toHaveLength(3);

            const amounts = expenses.map((e) => e.amount).sort((a, b) => a - b);
            expect(amounts).toEqual([392, 9824.8, 15000]);

            // Verify upload status changed to "committed"
            const updatedUpload = await db.query.uploads.findFirst({
                where: eq(uploads.id, upload.id),
            });
            expect(updatedUpload!.status).toBe("committed");
        });

        it("rejects commit if upload is not in review status", async () => {
            const upload = await createUpload(db, userId, {
                year: 2026,
                month: 7,
                filename: "test.png",
                filePath: "/tmp/test.png",
            });
            // Status is "pending" — should reject

            const cats = await getCategories(db, userId);
            const foodId = cats.find((c) => c.name === "Food")!.id;

            await expect(
                commitUpload(db, userId, upload.id, [
                    { categoryId: foodId, amount: 100, confidence: 0.9 },
                ])
            ).rejects.toThrow("expected 'review'");
        });
    });
});
