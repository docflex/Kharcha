// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import { logAuditAction, getAuditLog } from "@/lib/services/audit-service";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
});

afterAll(async () => {
    await testDb.cleanup();
});

describe("Audit Service", () => {
    it("logs a password_change action", async () => {
        await logAuditAction(testDb.db, userId, "password_change", undefined, "127.0.0.1");
        const logs = await getAuditLog(testDb.db, userId);
        expect(logs.length).toBe(1);
        expect(logs[0].action).toBe("password_change");
        expect(logs[0].ipAddress).toBe("127.0.0.1");
    });

    it("logs a profile_update action with details", async () => {
        await logAuditAction(testDb.db, userId, "profile_update", {
            name: "New Name",
        });
        const logs = await getAuditLog(testDb.db, userId);
        const profileLog = logs.find((l) => l.action === "profile_update");
        expect(profileLog).toBeDefined();
        expect(JSON.parse(profileLog!.details!)).toEqual({ name: "New Name" });
    });

    it("logs a data_export action", async () => {
        await logAuditAction(testDb.db, userId, "data_export", {
            format: "xlsx",
            rowCount: 42,
        });
        const logs = await getAuditLog(testDb.db, userId);
        const exportLog = logs.find((l) => l.action === "data_export");
        expect(exportLog).toBeDefined();
        const details = JSON.parse(exportLog!.details!);
        expect(details.format).toBe("xlsx");
        expect(details.rowCount).toBe(42);
    });

    it("returns logs ordered by most recent first", async () => {
        const logs = await getAuditLog(testDb.db, userId);
        expect(logs.length).toBeGreaterThanOrEqual(3);
        for (let i = 0; i < logs.length - 1; i++) {
            expect(new Date(logs[i].createdAt).getTime()).toBeGreaterThanOrEqual(
                new Date(logs[i + 1].createdAt).getTime()
            );
        }
    });

    it("respects the limit option", async () => {
        const logs = await getAuditLog(testDb.db, userId, { limit: 1 });
        expect(logs.length).toBe(1);
    });

    it("does not return logs from other users", async () => {
        const otherUserId = await seedTestUser(testDb.db, {
            email: "other@kharcha.app",
            name: "Other User",
        });
        await logAuditAction(testDb.db, otherUserId, "login_success");

        const userLogs = await getAuditLog(testDb.db, userId);
        const otherLogs = await getAuditLog(testDb.db, otherUserId);

        expect(userLogs.every((l) => l.userId === userId)).toBe(true);
        expect(otherLogs.every((l) => l.userId === otherUserId)).toBe(true);
        expect(otherLogs.length).toBe(1);
    });

    it("stores null details when not provided", async () => {
        await logAuditAction(testDb.db, userId, "login_success");
        const logs = await getAuditLog(testDb.db, userId);
        const loginLog = logs.find((l) => l.action === "login_success");
        expect(loginLog).toBeDefined();
        expect(loginLog!.details).toBeNull();
    });
});
