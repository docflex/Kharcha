// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { deleteAllUserData, deleteUserAccount } from "@/lib/services/danger-zone-service";
import {
    users,
    expenses,
    categories,
    budgets,
    monthlyIncome,
    uploads,
    personas,
    emailLog,
    auditLog,
    passwordResetTokens,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Cascade Delete — Full Table Verification", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let categoryId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        categoryId = await seedTestCategory(db, userId);
    });

    afterEach(async () => await cleanup());

    async function seedAllTables() {
        const now = new Date();

        await db.insert(expenses).values({
            id: crypto.randomUUID(),
            userId,
            categoryId,
            year: 2025,
            month: 6,
            amount: 1000,
            source: "manual",
            createdAt: now,
            updatedAt: now,
        });

        await db.insert(budgets).values({
            id: crypto.randomUUID(),
            userId,
            categoryId,
            monthlyLimit: 5000,
            effectiveFrom: "2025-06",
            createdAt: now,
        });

        await db.insert(monthlyIncome).values({
            id: crypto.randomUUID(),
            userId,
            year: 2025,
            month: 6,
            amount: 100000,
            source: "salary",
            createdAt: now,
        });

        const uploadId = crypto.randomUUID();
        await db.insert(uploads).values({
            id: uploadId,
            userId,
            year: 2025,
            month: 6,
            filename: "test.png",
            filePath: "/tmp/test.png",
            status: "committed",
            createdAt: now,
        });

        await db.insert(personas).values({
            id: crypto.randomUUID(),
            userId,
            year: 2025,
            month: 6,
            personaName: "The Saver",
            createdAt: now,
        });

        await db.insert(emailLog).values({
            id: crypto.randomUUID(),
            userId,
            type: "upload_reminder",
            status: "sent",
            sentAt: now,
        });

        await db.insert(auditLog).values({
            id: crypto.randomUUID(),
            userId,
            action: "password_change",
            createdAt: now,
        });

        await db.insert(passwordResetTokens).values({
            id: crypto.randomUUID(),
            userId,
            tokenHash: "abc123hash",
            expiresAt: new Date(Date.now() + 3600000),
            createdAt: now,
        });

        return uploadId;
    }

    // ─── deleteAllUserData — full table verification ────────────────────

    describe("deleteAllUserData", () => {
        it("deletes expenses", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(expenses).where(eq(expenses.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes categories", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(categories).where(eq(categories.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes budgets", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(budgets).where(eq(budgets.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes income entries", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db
                .select()
                .from(monthlyIncome)
                .where(eq(monthlyIncome.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes uploads", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(uploads).where(eq(uploads.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes personas", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(personas).where(eq(personas.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes email_log entries", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(emailLog).where(eq(emailLog.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes audit_log entries", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db.select().from(auditLog).where(eq(auditLog.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("deletes password_reset_tokens", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const rows = await db
                .select()
                .from(passwordResetTokens)
                .where(eq(passwordResetTokens.userId, userId));
            expect(rows).toHaveLength(0);
        });

        it("keeps the user account", async () => {
            await seedAllTables();
            await deleteAllUserData(db, userId);
            const [user] = await db.select().from(users).where(eq(users.id, userId));
            expect(user).toBeDefined();
            expect(user.email).toBe("test@kharcha.app");
        });

        it("does not throw for empty user (no data)", async () => {
            const emptyUserId = await seedTestUser(db, { email: "empty@test.com" });
            await expect(deleteAllUserData(db, emptyUserId)).resolves.not.toThrow();
        });

        it("does not affect other users' data", async () => {
            const otherUserId = await seedTestUser(db, { email: "other@test.com" });
            const otherCatId = await seedTestCategory(db, otherUserId, { name: "OtherFood" });

            await db.insert(expenses).values({
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

            await db.insert(monthlyIncome).values({
                id: crypto.randomUUID(),
                userId: otherUserId,
                year: 2025,
                month: 6,
                amount: 80000,
                source: "salary",
                createdAt: new Date(),
            });

            await seedAllTables();
            await deleteAllUserData(db, userId);

            const otherExpenses = await db
                .select()
                .from(expenses)
                .where(eq(expenses.userId, otherUserId));
            expect(otherExpenses).toHaveLength(1);

            const otherIncome = await db
                .select()
                .from(monthlyIncome)
                .where(eq(monthlyIncome.userId, otherUserId));
            expect(otherIncome).toHaveLength(1);
        });
    });

    // ─── deleteUserAccount — user + data removal ────────────────────────

    describe("deleteUserAccount", () => {
        it("deletes the user row AND all data", async () => {
            await seedAllTables();
            await deleteUserAccount(db, userId);

            const [user] = await db.select().from(users).where(eq(users.id, userId));
            expect(user).toBeUndefined();

            const rows = await db.select().from(expenses).where(eq(expenses.userId, userId));
            expect(rows).toHaveLength(0);

            const income = await db
                .select()
                .from(monthlyIncome)
                .where(eq(monthlyIncome.userId, userId));
            expect(income).toHaveLength(0);
        });
    });
});
