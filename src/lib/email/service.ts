import { eq, and } from "drizzle-orm";
import { emailLog } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { sendEmail } from "@/lib/email/client";
import {
    renderUploadReminder,
    renderDashboardReady,
    renderPasswordReset,
    type CategorySummary,
} from "@/lib/email/templates";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SendReminderInput {
    userName: string;
    userEmail: string;
    targetMonth: string;
    targetYear: number;
    appUrl: string;
    previousMonthStats?: {
        totalSpend: number;
        topCategories: CategorySummary[];
        savingsRate: number;
    };
}

export interface SendDashboardReadyInput {
    userName: string;
    userEmail: string;
    month: string;
    year: number;
    appUrl: string;
    totalSpend: number;
    topCategories: CategorySummary[];
    savingsRate: number;
    personaName?: string;
    personaEmoji?: string;
}

export interface EmailResult {
    success: boolean;
    error?: string;
}

// ─── Send Upload Reminder ───────────────────────────────────────────────────

export async function sendUploadReminder(
    db: Db,
    userId: string,
    input: SendReminderInput
): Promise<EmailResult> {
    const subject = `📊 Kharcha: Time to upload your ${input.targetMonth} ${input.targetYear} expenses!`;

    const html = renderUploadReminder({
        userName: input.userName,
        targetMonth: input.targetMonth,
        targetYear: input.targetYear,
        appUrl: input.appUrl,
        previousMonthStats: input.previousMonthStats,
    });

    const result = await sendEmail({
        to: input.userEmail,
        subject,
        html,
    });

    // Log to DB
    await db.insert(emailLog).values({
        id: uuid(),
        userId,
        type: "upload_reminder",
        subject,
        sentAt: new Date(),
        status: result.success ? "sent" : "failed",
    });

    return {
        success: result.success,
        error: result.error,
    };
}

// ─── Send Dashboard Ready ───────────────────────────────────────────────────

export async function sendDashboardReady(
    db: Db,
    userId: string,
    input: SendDashboardReadyInput
): Promise<EmailResult> {
    const subject = `✅ Kharcha: Your ${input.month} ${input.year} dashboard is ready!`;

    const html = renderDashboardReady({
        userName: input.userName,
        month: input.month,
        year: input.year,
        appUrl: input.appUrl,
        totalSpend: input.totalSpend,
        topCategories: input.topCategories,
        savingsRate: input.savingsRate,
        personaName: input.personaName,
        personaEmoji: input.personaEmoji,
    });

    const result = await sendEmail({
        to: input.userEmail,
        subject,
        html,
    });

    // Log to DB
    await db.insert(emailLog).values({
        id: uuid(),
        userId,
        type: "dashboard_ready",
        subject,
        sentAt: new Date(),
        status: result.success ? "sent" : "failed",
    });

    return {
        success: result.success,
        error: result.error,
    };
}

// ─── Send Password Reset ───────────────────────────────────────────────────

export interface SendPasswordResetInput {
    userName: string;
    userEmail: string;
    resetUrl: string;
}

export async function sendPasswordReset(
    db: Db,
    userId: string,
    input: SendPasswordResetInput
): Promise<EmailResult> {
    const subject = "🔑 Kharcha: Reset your password";

    const html = renderPasswordReset({
        userName: input.userName,
        resetUrl: input.resetUrl,
        expiresInMinutes: 60,
    });

    const result = await sendEmail({
        to: input.userEmail,
        subject,
        html,
    });

    // Log to DB
    await db.insert(emailLog).values({
        id: uuid(),
        userId,
        type: "password_reset",
        subject,
        sentAt: new Date(),
        status: result.success ? "sent" : "failed",
    });

    return {
        success: result.success,
        error: result.error,
    };
}

// ─── Get Email Log ──────────────────────────────────────────────────────────

export async function getEmailLog(
    db: Db,
    userId: string,
    type?: "upload_reminder" | "dashboard_ready"
) {
    const conditions = [eq(emailLog.userId, userId)];
    if (type) {
        conditions.push(eq(emailLog.type, type));
    }

    return db
        .select()
        .from(emailLog)
        .where(and(...conditions));
}
