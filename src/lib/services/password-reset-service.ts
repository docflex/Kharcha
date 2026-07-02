import { eq, and, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { users, passwordResetTokens } from "../db/schema";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hash a raw token with SHA-256 for safe storage.
 */
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a password reset token for a user.
 * Returns the raw (unhashed) token to send via email.
 * The hashed token is stored in the DB.
 */
export async function createResetToken(
    db: DB,
    email: string
): Promise<{ token: string; userId: string } | null> {
    const [user] = await db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, email));

    if (!user) return null;

    // OAuth-only users can't reset password
    if (!user.passwordHash) return null;

    const rawToken = randomBytes(32).toString("hex");
    const tokenH = hashToken(rawToken);

    await db.insert(passwordResetTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: tokenH,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
        createdAt: new Date(),
    });

    return { token: rawToken, userId: user.id };
}

/**
 * Validate a reset token and update the user's password.
 * Token is single-use: marked as used after successful reset.
 */
export async function resetPassword(
    db: DB,
    rawToken: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    const tokenH = hashToken(rawToken);

    const [tokenRow] = await db
        .select()
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.tokenHash, tokenH), isNull(passwordResetTokens.usedAt)));

    if (!tokenRow) {
        return { success: false, error: "Invalid or already used reset token" };
    }

    if (new Date() > tokenRow.expiresAt) {
        return { success: false, error: "Reset token has expired" };
    }

    // Hash new password and update user
    const newHash = await hash(newPassword, 12);
    const now = new Date();

    await db
        .update(users)
        .set({
            passwordHash: newHash,
            passwordChangedAt: now,
            updatedAt: now,
        })
        .where(eq(users.id, tokenRow.userId));

    // Mark token as used
    await db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, tokenRow.id));

    return { success: true };
}
