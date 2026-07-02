// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import {
    bulkDeleteExpenses,
    bulkUpdateExpenses,
    createExpense,
    getExpenses,
} from "@/lib/services/expense-service";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let catId1: string;
let catId2: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    catId1 = await seedTestCategory(testDb.db, userId, { name: "Food" });
    catId2 = await seedTestCategory(testDb.db, userId, { name: "Transport" });
});

afterAll(async () => await testDb.cleanup());

async function seedExpense(categoryId: string, amount: number) {
    return createExpense(testDb.db, userId, {
        categoryId,
        year: 2025,
        month: 6,
        amount,
        source: "manual",
    });
}

describe("bulkDeleteExpenses", () => {
    it("deletes multiple expenses by IDs", async () => {
        const e1 = await seedExpense(catId1, 100);
        const e2 = await seedExpense(catId1, 200);
        const e3 = await seedExpense(catId1, 300);

        const count = await bulkDeleteExpenses(testDb.db, userId, [e1.id, e2.id]);
        expect(count).toBe(2);

        const remaining = await getExpenses(testDb.db, userId, { year: 2025 });
        const ids = remaining.map((e) => e.id);
        expect(ids).toContain(e3.id);
        expect(ids).not.toContain(e1.id);
        expect(ids).not.toContain(e2.id);
    });

    it("returns 0 for empty array", async () => {
        const count = await bulkDeleteExpenses(testDb.db, userId, []);
        expect(count).toBe(0);
    });

    it("does not delete other users' expenses", async () => {
        const otherUser = await seedTestUser(testDb.db, { email: "other@test.com" });
        const otherCat = await seedTestCategory(testDb.db, otherUser, {
            name: "OtherCat",
        });
        const otherExpense = await createExpense(testDb.db, otherUser, {
            categoryId: otherCat,
            year: 2025,
            month: 6,
            amount: 999,
            source: "manual",
        });

        const count = await bulkDeleteExpenses(testDb.db, userId, [otherExpense.id]);
        expect(count).toBe(0);
    });
});

describe("bulkUpdateExpenses", () => {
    it("re-categorizes multiple expenses", async () => {
        const e1 = await seedExpense(catId1, 400);
        const e2 = await seedExpense(catId1, 500);

        const count = await bulkUpdateExpenses(testDb.db, userId, [e1.id, e2.id], {
            categoryId: catId2,
        });
        expect(count).toBe(2);

        const all = await getExpenses(testDb.db, userId, { year: 2025 });
        const updated = all.filter((e) => [e1.id, e2.id].includes(e.id));
        expect(updated.every((e) => e.categoryId === catId2)).toBe(true);
    });

    it("returns 0 for empty array", async () => {
        const count = await bulkUpdateExpenses(testDb.db, userId, [], {
            categoryId: catId2,
        });
        expect(count).toBe(0);
    });

    it("ignores non-existent IDs in bulk update", async () => {
        const e1 = await seedExpense(catId1, 600);
        const count = await bulkUpdateExpenses(testDb.db, userId, [e1.id, "non-existent-id"], {
            categoryId: catId2,
        });
        expect(count).toBe(1);
    });

    it("bulk delete with mix of own + other user IDs only deletes own", async () => {
        const e1 = await seedExpense(catId1, 700);

        const otherUser = await seedTestUser(testDb.db, { email: "bulk-other@test.com" });
        const otherCat = await seedTestCategory(testDb.db, otherUser, {
            name: "BulkOther",
        });
        const otherExpense = await createExpense(testDb.db, otherUser, {
            categoryId: otherCat,
            year: 2025,
            month: 6,
            amount: 999,
            source: "manual",
        });

        const count = await bulkDeleteExpenses(testDb.db, userId, [e1.id, otherExpense.id]);
        expect(count).toBe(1); // Only own expense deleted

        // Other user's expense still exists
        const otherRemaining = await getExpenses(testDb.db, otherUser, { year: 2025 });
        expect(otherRemaining.length).toBeGreaterThanOrEqual(1);
    });

    it("handles bulk delete with many IDs", async () => {
        const ids: string[] = [];
        for (let i = 0; i < 50; i++) {
            const e = await seedExpense(catId1, 10 + i);
            ids.push(e.id);
        }

        const count = await bulkDeleteExpenses(testDb.db, userId, ids);
        expect(count).toBe(50);
    });
});
