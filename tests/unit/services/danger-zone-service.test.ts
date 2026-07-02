// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { deleteAllUserData, deleteUserAccount } from "@/lib/services/danger-zone-service";
import { expenses, categories, budgets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let categoryId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    categoryId = await seedTestCategory(testDb.db, userId);
});

afterAll(async () => await testDb.cleanup());

describe("danger-zone-service", () => {
    describe("deleteAllUserData", () => {
        it("deletes all user data but keeps the account", async () => {
            // Seed some data
            await testDb.db.insert(expenses).values({
                id: crypto.randomUUID(),
                userId,
                categoryId,
                year: 2025,
                month: 6,
                amount: 1000,
                source: "manual",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await testDb.db.insert(budgets).values({
                id: crypto.randomUUID(),
                userId,
                categoryId,
                monthlyLimit: 5000,
                effectiveFrom: "2025-06",
                createdAt: new Date(),
            });

            await deleteAllUserData(testDb.db, userId);

            // User should still exist
            const [user] = await testDb.db.select().from(users).where(eq(users.id, userId));
            expect(user).toBeDefined();

            // Data should be gone
            const userExpenses = await testDb.db
                .select()
                .from(expenses)
                .where(eq(expenses.userId, userId));
            expect(userExpenses).toHaveLength(0);

            const userCategories = await testDb.db
                .select()
                .from(categories)
                .where(eq(categories.userId, userId));
            expect(userCategories).toHaveLength(0);

            const userBudgets = await testDb.db
                .select()
                .from(budgets)
                .where(eq(budgets.userId, userId));
            expect(userBudgets).toHaveLength(0);
        });

        it("does not affect other users", async () => {
            const otherUserId = await seedTestUser(testDb.db, {
                email: "other@test.com",
            });
            const otherCatId = await seedTestCategory(testDb.db, otherUserId, {
                name: "OtherFood",
            });

            await testDb.db.insert(expenses).values({
                id: crypto.randomUUID(),
                userId: otherUserId,
                categoryId: otherCatId,
                year: 2025,
                month: 6,
                amount: 500,
                source: "manual",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await deleteAllUserData(testDb.db, userId);

            const otherExpenses = await testDb.db
                .select()
                .from(expenses)
                .where(eq(expenses.userId, otherUserId));
            expect(otherExpenses).toHaveLength(1);
        });
    });

    describe("deleteUserAccount", () => {
        it("deletes user and all their data", async () => {
            const tempUserId = await seedTestUser(testDb.db, {
                email: "temp@test.com",
            });
            const tempCatId = await seedTestCategory(testDb.db, tempUserId, {
                name: "TempFood",
            });

            await testDb.db.insert(expenses).values({
                id: crypto.randomUUID(),
                userId: tempUserId,
                categoryId: tempCatId,
                year: 2025,
                month: 6,
                amount: 200,
                source: "manual",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await deleteUserAccount(testDb.db, tempUserId);

            // User should be gone
            const [user] = await testDb.db.select().from(users).where(eq(users.id, tempUserId));
            expect(user).toBeUndefined();

            // Data should be gone
            const userExpenses = await testDb.db
                .select()
                .from(expenses)
                .where(eq(expenses.userId, tempUserId));
            expect(userExpenses).toHaveLength(0);
        });
    });
});
