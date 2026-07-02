import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
} from "@/lib/services/expense-service";

describe("Expense Service", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let categoryId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        categoryId = await seedTestCategory(db, userId, { name: "Food" });
    });

    afterEach(async () => await cleanup());

    describe("createExpense", () => {
        it("creates an expense successfully", async () => {
            const expense = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 9824.8,
                source: "manual",
            });

            expect(expense).toBeDefined();
            expect(expense.amount).toBe(9824.8);
            expect(expense.year).toBe(2026);
            expect(expense.month).toBe(1);
            expect(expense.userId).toBe(userId);
            expect(expense.categoryId).toBe(categoryId);
            expect(expense.source).toBe("manual");
        });

        it("creates an OCR-sourced expense with confidence", async () => {
            const expense = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 15000,
                source: "ocr",
                confidence: 0.95,
            });

            expect(expense.source).toBe("ocr");
            expect(expense.confidence).toBe(0.95);
        });

        it("rejects invalid month", async () => {
            await expect(
                createExpense(db, userId, {
                    categoryId,
                    year: 2026,
                    month: 13,
                    amount: 100,
                })
            ).rejects.toThrow();
        });

        it("rejects negative amount", async () => {
            await expect(
                createExpense(db, userId, {
                    categoryId,
                    year: 2026,
                    month: 1,
                    amount: -100,
                })
            ).rejects.toThrow();
        });
    });

    describe("getExpenses", () => {
        it("returns all expenses for a user", async () => {
            await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });
            await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 2,
                amount: 6000,
            });

            const expenses = await getExpenses(db, userId);
            expect(expenses).toHaveLength(2);
        });

        it("filters by year and month", async () => {
            await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });
            await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 2,
                amount: 6000,
            });

            const jan = await getExpenses(db, userId, { year: 2026, month: 1 });
            expect(jan).toHaveLength(1);
            expect(jan[0].amount).toBe(5000);
        });

        it("filters by category", async () => {
            const rentCatId = await seedTestCategory(db, userId, { name: "Rent" });

            await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });
            await createExpense(db, userId, {
                categoryId: rentCatId,
                year: 2026,
                month: 1,
                amount: 15000,
            });

            const foodOnly = await getExpenses(db, userId, { categoryId });
            expect(foodOnly).toHaveLength(1);
            expect(foodOnly[0].amount).toBe(5000);
        });

        it("does not return other users' expenses", async () => {
            const otherUserId = await seedTestUser(db, { email: "other@test.com" });
            const otherCatId = await seedTestCategory(db, otherUserId, { name: "Food" });

            await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });
            await createExpense(db, otherUserId, {
                categoryId: otherCatId,
                year: 2026,
                month: 1,
                amount: 9999,
            });

            const myExpenses = await getExpenses(db, userId);
            expect(myExpenses).toHaveLength(1);
            expect(myExpenses[0].amount).toBe(5000);
        });
    });

    describe("getExpenseById", () => {
        it("returns a specific expense", async () => {
            const created = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 7500,
            });

            const found = await getExpenseById(db, userId, created.id);
            expect(found).toBeDefined();
            expect(found!.amount).toBe(7500);
        });

        it("returns null for non-existent expense", async () => {
            const found = await getExpenseById(db, userId, "non-existent-id");
            expect(found).toBeNull();
        });

        it("returns null for another user's expense", async () => {
            const created = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 7500,
            });

            const otherUserId = await seedTestUser(db, { email: "other@test.com" });
            const found = await getExpenseById(db, otherUserId, created.id);
            expect(found).toBeNull();
        });
    });

    describe("updateExpense", () => {
        it("updates amount", async () => {
            const created = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });

            const updated = await updateExpense(db, userId, created.id, {
                amount: 6000,
            });

            expect(updated).toBeDefined();
            expect(updated!.amount).toBe(6000);
        });

        it("updates notes", async () => {
            const created = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });

            const updated = await updateExpense(db, userId, created.id, {
                notes: "Corrected amount",
            });

            expect(updated!.notes).toBe("Corrected amount");
        });

        it("returns null when updating non-existent expense", async () => {
            const result = await updateExpense(db, userId, "fake-id", {
                amount: 100,
            });
            expect(result).toBeNull();
        });
    });

    describe("deleteExpense", () => {
        it("deletes an expense", async () => {
            const created = await createExpense(db, userId, {
                categoryId,
                year: 2026,
                month: 1,
                amount: 5000,
            });

            const deleted = await deleteExpense(db, userId, created.id);
            expect(deleted).toBe(true);

            const found = await getExpenseById(db, userId, created.id);
            expect(found).toBeNull();
        });

        it("returns false for non-existent expense", async () => {
            const result = await deleteExpense(db, userId, "fake-id");
            expect(result).toBe(false);
        });
    });
});
