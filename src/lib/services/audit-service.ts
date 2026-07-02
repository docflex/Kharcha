import { eq, desc } from "drizzle-orm";
import { auditLog } from "../db/schema";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

export type AuditAction =
    | "password_change"
    | "profile_update"
    | "data_export"
    | "data_delete"
    | "account_delete"
    | "login_failed"
    | "login_success";

// ─── Log Action ─────────────────────────────────────────────────────────────

export async function logAuditAction(
    db: DB,
    userId: string,
    action: AuditAction,
    details?: Record<string, unknown>,
    ipAddress?: string
): Promise<void> {
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        createdAt: new Date(),
    });
}

// ─── Get Audit Log ──────────────────────────────────────────────────────────

export async function getAuditLog(
    db: DB,
    userId: string,
    options?: { limit?: number }
): Promise<Array<typeof auditLog.$inferSelect>> {
    return db.query.auditLog.findMany({
        where: eq(auditLog.userId, userId),
        orderBy: [desc(auditLog.createdAt)],
        limit: options?.limit ?? 50,
    });
}
