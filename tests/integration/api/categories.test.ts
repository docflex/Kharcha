import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategoryStats,
    resolveCategoryIds,
} from "@/lib/services/category-service";
import { createExpense } from "@/lib/services/expense-service";

describe("Category Service", () => {
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

    describe("createCategory", () => {
        it("creates a category successfully", async () => {
            const cat = await createCategory(db, userId, {
                name: "Food",
                type: "expense",
            });

            expect(cat).toBeDefined();
            expect(cat.name).toBe("Food");
            expect(cat.type).toBe("expense");
            expect(cat.userId).toBe(userId);
        });

        it("creates an investment category", async () => {
            const cat = await createCategory(db, userId, {
                name: "Investments",
                type: "investment",
            });

            expect(cat.type).toBe("investment");
        });

        it("creates with icon and color", async () => {
            const cat = await createCategory(db, userId, {
                name: "Rent",
                icon: "home",
                color: "#FF5733",
            });

            expect(cat.icon).toBe("home");
            expect(cat.color).toBe("#FF5733");
        });

        it("rejects duplicate name for same user", async () => {
            await createCategory(db, userId, { name: "Food" });

            await expect(createCategory(db, userId, { name: "Food" })).rejects.toThrow();
        });

        it("allows same name for different users", async () => {
            const otherUserId = await seedTestUser(db, { email: "other@test.com" });

            const cat1 = await createCategory(db, userId, { name: "Food" });
            const cat2 = await createCategory(db, otherUserId, { name: "Food" });

            expect(cat1.name).toBe("Food");
            expect(cat2.name).toBe("Food");
            expect(cat1.id).not.toBe(cat2.id);
        });
    });

    describe("getCategories", () => {
        it("returns all categories for a user", async () => {
            await createCategory(db, userId, { name: "Food" });
            await createCategory(db, userId, { name: "Rent" });
            await createCategory(db, userId, { name: "Investments", type: "investment" });

            const cats = await getCategories(db, userId);
            expect(cats).toHaveLength(3);
        });

        it("filters by type", async () => {
            await createCategory(db, userId, { name: "Food" });
            await createCategory(db, userId, { name: "Investments", type: "investment" });

            const expenseOnly = await getCategories(db, userId, { type: "expense" });
            expect(expenseOnly).toHaveLength(1);
            expect(expenseOnly[0].name).toBe("Food");

            const investmentOnly = await getCategories(db, userId, { type: "investment" });
            expect(investmentOnly).toHaveLength(1);
            expect(investmentOnly[0].name).toBe("Investments");
        });

        it("does not return other users' categories", async () => {
            const otherUserId = await seedTestUser(db, { email: "other@test.com" });

            await createCategory(db, userId, { name: "Food" });
            await createCategory(db, otherUserId, { name: "Rent" });

            const mine = await getCategories(db, userId);
            expect(mine).toHaveLength(1);
            expect(mine[0].name).toBe("Food");
        });
    });

    describe("updateCategory", () => {
        it("updates name and color", async () => {
            const cat = await createCategory(db, userId, { name: "Food" });

            const updated = await updateCategory(db, userId, cat.id, {
                name: "Food & Dining",
                color: "#00FF00",
            });

            expect(updated!.name).toBe("Food & Dining");
            expect(updated!.color).toBe("#00FF00");
        });

        it("returns null for non-existent category", async () => {
            const result = await updateCategory(db, userId, "fake-id", {
                name: "Nope",
            });
            expect(result).toBeNull();
        });
    });

    describe("deleteCategory", () => {
        it("deletes a category", async () => {
            const cat = await createCategory(db, userId, { name: "Food" });

            const deleted = await deleteCategory(db, userId, cat.id);
            expect(deleted).toBe(true);

            const found = await getCategoryById(db, userId, cat.id);
            expect(found).toBeNull();
        });

        it("returns false for non-existent category", async () => {
            const result = await deleteCategory(db, userId, "fake-id");
            expect(result).toBe(false);
        });
    });

    describe("getCategoryStats", () => {
        it("returns usage counts and total amounts per category", async () => {
            const food = await createCategory(db, userId, { name: "Food" });
            const rent = await createCategory(db, userId, { name: "Rent" });

            await createExpense(db, userId, {
                categoryId: food.id,
                year: 2026,
                month: 1,
                amount: 500,
            });
            await createExpense(db, userId, {
                categoryId: food.id,
                year: 2026,
                month: 1,
                amount: 300,
            });
            await createExpense(db, userId, {
                categoryId: rent.id,
                year: 2026,
                month: 1,
                amount: 15000,
            });

            const stats = await getCategoryStats(db, userId);
            expect(stats.length).toBe(2);

            const foodStat = stats.find((s) => s.categoryId === food.id);
            expect(foodStat).toBeDefined();
            expect(foodStat!.count).toBe(2);
            expect(foodStat!.totalAmount).toBeCloseTo(800, 2);

            const rentStat = stats.find((s) => s.categoryId === rent.id);
            expect(rentStat!.count).toBe(1);
            expect(rentStat!.totalAmount).toBeCloseTo(15000, 2);
        });

        it("returns empty array when user has no expenses", async () => {
            const stats = await getCategoryStats(db, userId);
            expect(stats).toEqual([]);
        });

        it("scopes stats to the requesting user", async () => {
            const cat = await createCategory(db, userId, { name: "Food" });
            await createExpense(db, userId, {
                categoryId: cat.id,
                year: 2026,
                month: 1,
                amount: 500,
            });

            const otherUser = await seedTestUser(db, { email: "stats-other@test.com" });
            const otherStats = await getCategoryStats(db, otherUser);
            expect(otherStats).toEqual([]);
        });
    });

    describe("resolveCategoryIds", () => {
        it("resolves existing category names to IDs", async () => {
            await createCategory(db, userId, { name: "Food" });
            await createCategory(db, userId, { name: "Rent" });

            const resolved = await resolveCategoryIds(db, userId, [
                { categoryName: "Food", amount: 500, confidence: 0.9 },
                { categoryName: "Rent", amount: 15000, confidence: 0.95 },
            ]);

            expect(resolved).toHaveLength(2);
            expect(resolved[0].categoryId).toBeTruthy();
            expect(resolved[0].amount).toBe(500);
            expect(resolved[1].categoryId).toBeTruthy();
        });

        it("creates new category on the fly for unknown names", async () => {
            const resolved = await resolveCategoryIds(db, userId, [
                { categoryName: "NewCategory", amount: 1000, confidence: 0.8 },
            ]);

            expect(resolved).toHaveLength(1);
            expect(resolved[0].categoryId).toBeTruthy();

            // Verify the category was created
            const cats = await getCategories(db, userId);
            expect(cats.some((c) => c.name === "NewCategory")).toBe(true);
        });

        it("reuses same ID for duplicate names in the same batch", async () => {
            const resolved = await resolveCategoryIds(db, userId, [
                { categoryName: "Transport", amount: 200, confidence: 0.8 },
                { categoryName: "Transport", amount: 300, confidence: 0.9 },
            ]);

            expect(resolved).toHaveLength(2);
            expect(resolved[0].categoryId).toBe(resolved[1].categoryId);
        });

        it("is case-insensitive when matching names", async () => {
            await createCategory(db, userId, { name: "Groceries" });

            const resolved = await resolveCategoryIds(db, userId, [
                { categoryName: "groceries", amount: 600, confidence: 0.85 },
            ]);

            // Should match existing, not create new
            const cats = await getCategories(db, userId);
            const groceryCats = cats.filter((c) => c.name.toLowerCase() === "groceries");
            expect(groceryCats).toHaveLength(1);
            expect(resolved[0].categoryId).toBe(groceryCats[0].id);
        });
    });
});
