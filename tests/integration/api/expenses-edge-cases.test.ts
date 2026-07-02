import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
} from "@/lib/services/expense-service";

describe("Expense Service — Edge Cases", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let catFood: string;
    let catRent: string;
    let catInvest: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        catFood = await seedTestCategory(db, userId, { name: "Food" });
        catRent = await seedTestCategory(db, userId, { name: "Rent" });
        catInvest = await seedTestCategory(db, userId, {
            name: "Investments",
            type: "investment",
        });
    });

    afterEach(async () => await cleanup());

    describe("validation edge cases", () => {
        it("rejects zero amount", async () => {
            await expect(
                createExpense(db, userId, {
                    categoryId: catFood,
                    year: 2026,
                    month: 1,
                    amount: 0,
                    source: "manual",
                })
            ).rejects.toThrow();
        });

        it("rejects negative amount", async () => {
            await expect(
                createExpense(db, userId, {
                    categoryId: catFood,
                    year: 2026,
                    month: 1,
                    amount: -500,
                    source: "manual",
                })
            ).rejects.toThrow();
        });

        it("rejects month 0", async () => {
            await expect(
                createExpense(db, userId, {
                    categoryId: catFood,
                    year: 2026,
                    month: 0,
                    amount: 100,
                    source: "manual",
                })
            ).rejects.toThrow();
        });

        it("rejects month 13", async () => {
            await expect(
                createExpense(db, userId, {
                    categoryId: catFood,
                    year: 2026,
                    month: 13,
                    amount: 100,
                    source: "manual",
                })
            ).rejects.toThrow();
        });

        it("accepts very large amounts", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 99999999.99,
                source: "manual",
            });
            expect(expense.amount).toBe(99999999.99);
        });

        it("accepts decimal amounts with precision", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 0.01,
                source: "manual",
            });
            expect(expense.amount).toBe(0.01);
        });

        it("handles notes field with special characters", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 100,
                source: "manual",
                notes: 'Lunch at "McDonalds" & Starbucks — ₹100',
            });
            expect(expense.notes).toBe('Lunch at "McDonalds" & Starbucks — ₹100');
        });

        it("handles empty string notes as valid", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 100,
                source: "manual",
                notes: "",
            });
            expect(expense.notes).toBe("");
        });
    });

    describe("multi-user isolation", () => {
        it("user A cannot see user B expenses", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await seedTestCategory(db, userB, { name: "Food" });

            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 500,
                source: "manual",
            });
            await createExpense(db, userB, {
                categoryId: catB,
                year: 2026,
                month: 1,
                amount: 800,
                source: "manual",
            });

            const myExpenses = await getExpenses(db, userId, { year: 2026, month: 1 });
            expect(myExpenses).toHaveLength(1);
            expect(myExpenses[0].amount).toBe(500);
        });

        it("user A cannot update user B expense", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await seedTestCategory(db, userB, { name: "Food" });
            const expenseB = await createExpense(db, userB, {
                categoryId: catB,
                year: 2026,
                month: 1,
                amount: 800,
                source: "manual",
            });

            const result = await updateExpense(db, userId, expenseB.id, { amount: 999 });
            expect(result).toBeNull();
        });

        it("user A cannot delete user B expense", async () => {
            const userB = await seedTestUser(db, { email: "b@test.com" });
            const catB = await seedTestCategory(db, userB, { name: "Food" });
            const expenseB = await createExpense(db, userB, {
                categoryId: catB,
                year: 2026,
                month: 1,
                amount: 800,
                source: "manual",
            });

            const deleted = await deleteExpense(db, userId, expenseB.id);
            expect(deleted).toBe(false);

            // Verify it still exists for user B
            const found = await getExpenseById(db, userB, expenseB.id);
            expect(found).toBeDefined();
        });
    });

    describe("filtering", () => {
        beforeEach(async () => {
            // Seed expenses across multiple months and categories
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 100,
                source: "manual",
            });
            await createExpense(db, userId, {
                categoryId: catRent,
                year: 2026,
                month: 1,
                amount: 15000,
                source: "manual",
            });
            await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 2,
                amount: 200,
                source: "ocr",
                confidence: 0.9,
            });
            await createExpense(db, userId, {
                categoryId: catInvest,
                year: 2025,
                month: 12,
                amount: 5000,
                source: "import",
            });
        });

        it("filters by year only", async () => {
            const r = await getExpenses(db, userId, { year: 2026 });
            expect(r).toHaveLength(3);
        });

        it("filters by year and month", async () => {
            const r = await getExpenses(db, userId, { year: 2026, month: 1 });
            expect(r).toHaveLength(2);
        });

        it("filters by categoryId", async () => {
            const r = await getExpenses(db, userId, { categoryId: catFood });
            expect(r).toHaveLength(2);
        });

        it("returns empty for year with no data", async () => {
            const r = await getExpenses(db, userId, { year: 2020 });
            expect(r).toHaveLength(0);
        });

        it("returns empty for month with no data", async () => {
            const r = await getExpenses(db, userId, { year: 2026, month: 6 });
            expect(r).toHaveLength(0);
        });
    });

    describe("update edge cases", () => {
        it("updates amount to a valid value", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 500,
                source: "manual",
            });

            const updated = await updateExpense(db, userId, expense.id, { amount: 750.5 });
            expect(updated!.amount).toBe(750.5);
        });

        it("updates source from manual to ocr", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 500,
                source: "manual",
            });

            const updated = await updateExpense(db, userId, expense.id, {
                source: "ocr",
                confidence: 0.85,
            });
            expect(updated!.source).toBe("ocr");
        });

        it("returns null for non-existent expense id", async () => {
            const result = await updateExpense(db, userId, "nonexistent-id", { amount: 100 });
            expect(result).toBeNull();
        });
    });

    describe("delete edge cases", () => {
        it("returns false for non-existent expense id", async () => {
            const result = await deleteExpense(db, userId, "nonexistent-id");
            expect(result).toBe(false);
        });

        it("expense is truly gone after delete", async () => {
            const expense = await createExpense(db, userId, {
                categoryId: catFood,
                year: 2026,
                month: 1,
                amount: 500,
                source: "manual",
            });

            await deleteExpense(db, userId, expense.id);
            const found = await getExpenseById(db, userId, expense.id);
            expect(found).toBeNull();

            // Also gone from list
            const all = await getExpenses(db, userId, { year: 2026, month: 1 });
            expect(all).toHaveLength(0);
        });
    });
});
