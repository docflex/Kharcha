// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Mock the email client
vi.mock("@/lib/email/client", () => ({
    sendEmail: vi.fn().mockResolvedValue({
        success: true,
        messageId: "<mock-id@kharcha.app>",
    }),
    isEmailConfigured: vi.fn().mockReturnValue(true),
}));

import { sendUploadReminder, sendDashboardReady, getEmailLog } from "@/lib/email/service";
import { sendEmail } from "@/lib/email/client";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
});

afterAll(async () => await testDb.cleanup());

beforeEach(() => {
    vi.clearAllMocks();
});

describe("Email Service", () => {
    describe("sendUploadReminder", () => {
        it("sends upload reminder email and logs it", async () => {
            const result = await sendUploadReminder(testDb.db, userId, {
                userName: "Rehber",
                userEmail: "rehber@example.com",
                targetMonth: "June",
                targetYear: 2026,
                appUrl: "http://localhost:3000",
            });

            expect(result.success).toBe(true);
            expect(sendEmail).toHaveBeenCalledOnce();
            expect(sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: "rehber@example.com",
                    subject: expect.stringContaining("June"),
                })
            );

            // Check email was logged
            const logs = await testDb.db
                .select()
                .from(schema.emailLog)
                .where(eq(schema.emailLog.userId, userId));
            expect(logs).toHaveLength(1);
            expect(logs[0].type).toBe("upload_reminder");
            expect(logs[0].status).toBe("sent");
        });

        it("logs failed status when email fails", async () => {
            vi.mocked(sendEmail).mockResolvedValueOnce({
                success: false,
                error: "SMTP connection refused",
            });

            const result = await sendUploadReminder(testDb.db, userId, {
                userName: "Rehber",
                userEmail: "rehber@example.com",
                targetMonth: "June",
                targetYear: 2026,
                appUrl: "http://localhost:3000",
            });

            expect(result.success).toBe(false);

            const logs = await testDb.db
                .select()
                .from(schema.emailLog)
                .where(eq(schema.emailLog.userId, userId));
            const failedLog = logs.find((l) => l.status === "failed");
            expect(failedLog).toBeDefined();
        });
    });

    describe("sendDashboardReady", () => {
        it("sends dashboard ready email and logs it", async () => {
            const result = await sendDashboardReady(testDb.db, userId, {
                userName: "Rehber",
                userEmail: "rehber@example.com",
                month: "February",
                year: 2026,
                appUrl: "http://localhost:3000",
                totalSpend: 285000,
                topCategories: [
                    { name: "Investments", amount: 200077 },
                    { name: "Rent", amount: 15000 },
                ],
                savingsRate: 32.1,
                personaName: "The Optimizer",
                personaEmoji: "🧘",
            });

            expect(result.success).toBe(true);
            expect(sendEmail).toHaveBeenCalledOnce();
            expect(sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: "rehber@example.com",
                    subject: expect.stringContaining("February"),
                })
            );

            const logs = await testDb.db
                .select()
                .from(schema.emailLog)
                .where(eq(schema.emailLog.userId, userId));
            const dashLog = logs.find((l) => l.type === "dashboard_ready");
            expect(dashLog).toBeDefined();
            expect(dashLog!.status).toBe("sent");
        });

        it("logs failed status on email failure", async () => {
            vi.mocked(sendEmail).mockResolvedValueOnce({
                success: false,
                error: "Rate limited",
            });

            const result = await sendDashboardReady(testDb.db, userId, {
                userName: "Rehber",
                userEmail: "rehber@example.com",
                month: "March",
                year: 2026,
                appUrl: "http://localhost:3000",
                totalSpend: 100000,
                topCategories: [{ name: "Food", amount: 10000 }],
                savingsRate: 20,
            });

            expect(result.success).toBe(false);

            const logs = await testDb.db
                .select()
                .from(schema.emailLog)
                .where(eq(schema.emailLog.userId, userId));
            const failedLog = logs.find(
                (l) => l.type === "dashboard_ready" && l.status === "failed"
            );
            expect(failedLog).toBeDefined();
        });
    });

    describe("getEmailLog", () => {
        it("returns email log entries for a user", async () => {
            const logs = await getEmailLog(testDb.db, userId);
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].userId).toBe(userId);
        });

        it("filters by type", async () => {
            const logs = await getEmailLog(testDb.db, userId, "upload_reminder");
            expect(logs.every((l) => l.type === "upload_reminder")).toBe(true);
        });

        it("returns empty array for unknown user", async () => {
            const logs = await getEmailLog(testDb.db, "nonexistent-user");
            expect(logs).toHaveLength(0);
        });
    });
});
