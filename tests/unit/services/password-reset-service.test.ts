// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import { createResetToken, resetPassword, hashToken } from "@/lib/services/password-reset-service";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db, {
        email: "reset@test.com",
        password: "OldPassword1!",
    });
});

afterAll(async () => await testDb.cleanup());

describe("password-reset-service", () => {
    describe("hashToken", () => {
        it("returns a consistent SHA-256 hex string", () => {
            const hash = hashToken("test-token");
            expect(hash).toHaveLength(64);
            expect(hashToken("test-token")).toBe(hash);
        });

        it("produces different hashes for different tokens", () => {
            expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
        });
    });

    describe("createResetToken", () => {
        it("creates a token for an existing user with password", async () => {
            const result = await createResetToken(testDb.db, "reset@test.com");
            expect(result).not.toBeNull();
            expect(result!.token).toHaveLength(64); // 32 bytes hex
            expect(result!.userId).toBe(userId);
        });

        it("returns null for non-existent email", async () => {
            const result = await createResetToken(testDb.db, "nobody@test.com");
            expect(result).toBeNull();
        });

        it("returns null for OAuth-only user (no password)", async () => {
            // Create user without password
            const oauthId = await seedTestUser(testDb.db, {
                email: "oauth@test.com",
            });
            // Remove password hash
            await testDb.db.update(users).set({ passwordHash: null }).where(eq(users.id, oauthId));

            const result = await createResetToken(testDb.db, "oauth@test.com");
            expect(result).toBeNull();
        });

        it("stores hashed token in DB, not raw", async () => {
            const result = await createResetToken(testDb.db, "reset@test.com");
            expect(result).not.toBeNull();

            const rows = await testDb.db
                .select()
                .from(passwordResetTokens)
                .where(eq(passwordResetTokens.userId, userId));

            const lastRow = rows[rows.length - 1];
            // DB stores hash, not raw token
            expect(lastRow.tokenHash).not.toBe(result!.token);
            expect(lastRow.tokenHash).toBe(hashToken(result!.token));
        });
    });

    describe("resetPassword", () => {
        it("resets password with valid token", async () => {
            const result = await createResetToken(testDb.db, "reset@test.com");
            expect(result).not.toBeNull();

            const reset = await resetPassword(testDb.db, result!.token, "NewPassword1!");
            expect(reset.success).toBe(true);

            // Verify new password hash
            const [user] = await testDb.db.select().from(users).where(eq(users.id, userId));
            const matches = await compare("NewPassword1!", user.passwordHash!);
            expect(matches).toBe(true);
        });

        it("marks token as used (single-use)", async () => {
            const result = await createResetToken(testDb.db, "reset@test.com");
            expect(result).not.toBeNull();

            await resetPassword(testDb.db, result!.token, "AnotherPass1!");
            const secondAttempt = await resetPassword(testDb.db, result!.token, "ThirdPass1!");
            expect(secondAttempt.success).toBe(false);
            expect(secondAttempt.error).toContain("Invalid or already used");
        });

        it("rejects invalid token", async () => {
            const result = await resetPassword(testDb.db, "totally-invalid-token", "SomePass1!");
            expect(result.success).toBe(false);
            expect(result.error).toContain("Invalid or already used");
        });

        it("rejects expired token", async () => {
            const result = await createResetToken(testDb.db, "reset@test.com");
            expect(result).not.toBeNull();

            // Manually expire the token
            const tokenHash = hashToken(result!.token);
            await testDb.db
                .update(passwordResetTokens)
                .set({ expiresAt: new Date(Date.now() - 1000) })
                .where(eq(passwordResetTokens.tokenHash, tokenHash));

            const reset = await resetPassword(testDb.db, result!.token, "ExpiredPass1!");
            expect(reset.success).toBe(false);
            expect(reset.error).toContain("expired");
        });

        it("updates passwordChangedAt on successful reset", async () => {
            const before = new Date();
            const result = await createResetToken(testDb.db, "reset@test.com");
            await resetPassword(testDb.db, result!.token, "ChangedPass1!");

            const [user] = await testDb.db.select().from(users).where(eq(users.id, userId));
            expect(user.passwordChangedAt).not.toBeNull();
            expect(user.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });
    });
});
