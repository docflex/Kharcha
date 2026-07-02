import { eq } from "drizzle-orm";
import {
    users,
    expenses,
    budgets,
    monthlyIncome,
    uploads,
    personas,
    categories,
    emailLog,
    auditLog,
    passwordResetTokens,
    ocrCorrections,
} from "../db/schema";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

/**
 * Delete all user data but keep the account.
 * Respects foreign key ordering: child tables first.
 */
export async function deleteAllUserData(db: DB, userId: string): Promise<void> {
    // Delete in dependency order (children before parents)

    // OCR corrections depend on uploads
    const userUploads = await db
        .select({ id: uploads.id })
        .from(uploads)
        .where(eq(uploads.userId, userId));
    if (userUploads.length > 0) {
        for (const upload of userUploads) {
            await db.delete(ocrCorrections).where(eq(ocrCorrections.uploadId, upload.id));
        }
    }

    // Tables with userId FK
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(budgets).where(eq(budgets.userId, userId));
    await db.delete(monthlyIncome).where(eq(monthlyIncome.userId, userId));
    await db.delete(uploads).where(eq(uploads.userId, userId));
    await db.delete(personas).where(eq(personas.userId, userId));
    await db.delete(emailLog).where(eq(emailLog.userId, userId));
    await db.delete(auditLog).where(eq(auditLog.userId, userId));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    // Categories last (expenses reference them)
    await db.delete(categories).where(eq(categories.userId, userId));
}

/**
 * Delete all user data AND the user account itself.
 */
export async function deleteUserAccount(db: DB, userId: string): Promise<void> {
    await deleteAllUserData(db, userId);
    await db.delete(users).where(eq(users.id, userId));
}
