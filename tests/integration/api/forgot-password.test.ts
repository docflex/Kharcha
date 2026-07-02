// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import { createResetToken, resetPassword, hashToken } from "@/lib/services/password-reset-service";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

/**
 * Integration test for the forgot-password → reset-password flow.
 * Tests the service functions end-to-end (the routes simply call these
 * with Zod validation + error handling, which are tested separately).
 */

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db, {
        email: "forgot@test.com",
        password: "OldSecure@1",
    });
});

afterAll(async () => await testDb.cleanup());

describe("Forgot/Reset Password — Integration Flow", () => {
    it("full flow: create token → reset → verify new password works", async () => {
        const tokenResult = await createResetToken(testDb.db, "forgot@test.com");
        expect(tokenResult).not.toBeNull();

        const resetResult = await resetPassword(testDb.db, tokenResult!.token, "NewSecure@1");
        expect(resetResult.success).toBe(true);

        const [user] = await testDb.db.select().from(users).where(eq(users.id, userId));
        const matches = await compare("NewSecure@1", user.passwordHash!);
        expect(matches).toBe(true);
    });

    it("returns null for unknown email (no info leak)", async () => {
        const result = await createResetToken(testDb.db, "unknown@nowhere.com");
        expect(result).toBeNull();
    });

    it("returns null for OAuth-only user (no info leak)", async () => {
        const oauthId = await seedTestUser(testDb.db, {
            email: "oauthflow@test.com",
        });
        await testDb.db.update(users).set({ passwordHash: null }).where(eq(users.id, oauthId));

        const result = await createResetToken(testDb.db, "oauthflow@test.com");
        expect(result).toBeNull();
    });

    it("rejects reset with expired token", async () => {
        const tokenResult = await createResetToken(testDb.db, "forgot@test.com");
        expect(tokenResult).not.toBeNull();

        // Expire the token
        await testDb.db
            .update(passwordResetTokens)
            .set({ expiresAt: new Date(Date.now() - 60000) })
            .where(eq(passwordResetTokens.tokenHash, hashToken(tokenResult!.token)));

        const resetResult = await resetPassword(testDb.db, tokenResult!.token, "Expired@Pass1");
        expect(resetResult.success).toBe(false);
        expect(resetResult.error).toContain("expired");
    });

    it("rejects reset with already-used token", async () => {
        const tokenResult = await createResetToken(testDb.db, "forgot@test.com");
        expect(tokenResult).not.toBeNull();

        // Use the token
        await resetPassword(testDb.db, tokenResult!.token, "First@Reset1");

        // Try again
        const secondAttempt = await resetPassword(testDb.db, tokenResult!.token, "Second@Reset1");
        expect(secondAttempt.success).toBe(false);
        expect(secondAttempt.error).toContain("Invalid or already used");
    });

    it("rejects reset with completely invalid token", async () => {
        const result = await resetPassword(testDb.db, "invalid-random-token", "Any@Pass123");
        expect(result.success).toBe(false);
    });

    it("allows multiple reset tokens for the same user", async () => {
        const token1 = await createResetToken(testDb.db, "forgot@test.com");
        const token2 = await createResetToken(testDb.db, "forgot@test.com");

        expect(token1).not.toBeNull();
        expect(token2).not.toBeNull();
        expect(token1!.token).not.toBe(token2!.token);

        // Both should be valid (latest one wins)
        const result = await resetPassword(testDb.db, token2!.token, "Multi@Token1");
        expect(result.success).toBe(true);
    });

    it("sets passwordChangedAt after successful reset", async () => {
        const before = new Date();
        const tokenResult = await createResetToken(testDb.db, "forgot@test.com");
        await resetPassword(testDb.db, tokenResult!.token, "Changed@Time1");

        const [user] = await testDb.db.select().from(users).where(eq(users.id, userId));
        expect(user.passwordChangedAt).not.toBeNull();
        expect(user.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
});
