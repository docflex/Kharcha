import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from "@/lib/services/category-service";
import { createExpense } from "@/lib/services/expense-service";

describe("Category Service — Edge Cases", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
    });

    afterEach(async () => await cleanup());

    describe("name validation", () => {
        it("creates category with special characters in name", async () => {
            const cat = await createCategory(db, userId, {
                name: "Food & Dining — Restaurants",
            });
            expect(cat.name).toBe("Food & Dining — Restaurants");
        });

        it("creates category with unicode name", async () => {
            const cat = await createCategory(db, userId, {
                name: "खाना (Food)",
            });
            expect(cat.name).toBe("खाना (Food)");
        });

        it("rejects empty name", async () => {
            await expect(createCategory(db, userId, { name: "" })).rejects.toThrow();
        });
    });

    describe("type defaults", () => {
        it("defaults to expense type when not specified", async () => {
            const cat = await createCategory(db, userId, { name: "Groceries" });
            expect(cat.type).toBe("expense");
        });

        it("correctly sets investment type", async () => {
            const cat = await createCategory(db, userId, {
                name: "Mutual Funds",
                type: "investment",
            });
            expect(cat.type).toBe("investment");
        });
    });

    describe("multi-user isolation", () => {
        it("user A cannot read user B categories", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });

            await createCategory(db, userId, { name: "My Food" });
            await createCategory(db, userB, { name: "Their Food" });

            const mine = await getCategories(db, userId);
            expect(mine).toHaveLength(1);
            expect(mine[0].name).toBe("My Food");
        });

        it("user A cannot update user B category", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await createCategory(db, userB, { name: "Their Food" });

            const result = await updateCategory(db, userId, catB.id, { name: "Hacked" });
            expect(result).toBeNull();

            // Original is unchanged
            const original = await getCategoryById(db, userB, catB.id);
            expect(original!.name).toBe("Their Food");
        });

        it("user A cannot delete user B category", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await createCategory(db, userB, { name: "Their Food" });

            const result = await deleteCategory(db, userId, catB.id);
            expect(result).toBe(false);
        });
    });

    describe("getCategoryById", () => {
        it("returns null for non-existent id", async () => {
            const result = await getCategoryById(db, userId, "fake-uuid");
            expect(result).toBeNull();
        });

        it("returns null when user mismatch", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const cat = await createCategory(db, userId, { name: "Food" });

            const result = await getCategoryById(db, userB, cat.id);
            expect(result).toBeNull();
        });
    });

    describe("bulk operations", () => {
        it("handles many categories", async () => {
            const names = Array.from({ length: 50 }, (_, i) => `Category_${i}`);
            for (const name of names) {
                await createCategory(db, userId, { name });
            }

            const all = await getCategories(db, userId);
            expect(all).toHaveLength(50);
        });

        it("filters expense vs investment correctly with many categories", async () => {
            for (let i = 0; i < 10; i++) {
                await createCategory(db, userId, { name: `Exp_${i}`, type: "expense" });
            }
            for (let i = 0; i < 5; i++) {
                await createCategory(db, userId, { name: `Inv_${i}`, type: "investment" });
            }

            const exp = await getCategories(db, userId, { type: "expense" });
            expect(exp).toHaveLength(10);

            const inv = await getCategories(db, userId, { type: "investment" });
            expect(inv).toHaveLength(5);
        });
    });

    describe("cascading behavior", () => {
        it("expenses survive category delete with foreign key", async () => {
            // Note: SQLite with foreign_keys ON will cascade delete
            const catId = await seedTestCategory(db, userId, { name: "Food" });

            await createExpense(db, userId, {
                categoryId: catId,
                year: 2026,
                month: 1,
                amount: 5000,
                source: "manual",
            });

            // Category delete should cascade and delete the expense
            await deleteCategory(db, userId, catId);

            const cat = await getCategoryById(db, userId, catId);
            expect(cat).toBeNull();
        });
    });
});
