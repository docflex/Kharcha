import { eq, and, desc } from "drizzle-orm";
import { monthlyIncome } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

export interface CreateIncomeInput {
    year: number;
    month: number;
    amount: number;
    source: string; // "salary", "freelance", "bonus", "side", etc.
}

export interface IncomeEntry {
    id: string;
    userId: string;
    year: number;
    month: number;
    amount: number;
    source: string | null;
    createdAt: Date;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createIncome(
    db: Db,
    userId: string,
    input: CreateIncomeInput
): Promise<IncomeEntry> {
    const id = uuid();
    const now = new Date();

    const [entry] = await db
        .insert(monthlyIncome)
        .values({
            id,
            userId,
            year: input.year,
            month: input.month,
            amount: input.amount,
            source: input.source,
            createdAt: now,
        })
        .returning();

    return entry;
}

/**
 * Upsert an income entry — if one already exists for the same
 * user/year/month/source, update its amount instead of failing.
 */
export async function upsertIncome(
    db: Db,
    userId: string,
    input: CreateIncomeInput
): Promise<IncomeEntry> {
    const id = uuid();
    const now = new Date();

    const [entry] = await db
        .insert(monthlyIncome)
        .values({
            id,
            userId,
            year: input.year,
            month: input.month,
            amount: input.amount,
            source: input.source,
            createdAt: now,
        })
        .onConflictDoUpdate({
            target: [
                monthlyIncome.userId,
                monthlyIncome.year,
                monthlyIncome.month,
                monthlyIncome.source,
            ],
            set: { amount: input.amount },
        })
        .returning();

    return entry;
}

export async function getIncome(
    db: Db,
    userId: string,
    filters?: { year?: number; month?: number }
): Promise<IncomeEntry[]> {
    const conditions = [eq(monthlyIncome.userId, userId)];

    if (filters?.year) conditions.push(eq(monthlyIncome.year, filters.year));
    if (filters?.month) conditions.push(eq(monthlyIncome.month, filters.month));

    return db
        .select()
        .from(monthlyIncome)
        .where(and(...conditions))
        .orderBy(desc(monthlyIncome.year), desc(monthlyIncome.month));
}

export async function updateIncome(
    db: Db,
    userId: string,
    incomeId: string,
    input: Partial<CreateIncomeInput>
): Promise<IncomeEntry | null> {
    const updates: Record<string, unknown> = {};
    if (input.year !== undefined) updates.year = input.year;
    if (input.month !== undefined) updates.month = input.month;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.source !== undefined) updates.source = input.source;

    if (Object.keys(updates).length === 0) return null;

    const [entry] = await db
        .update(monthlyIncome)
        .set(updates)
        .where(and(eq(monthlyIncome.id, incomeId), eq(monthlyIncome.userId, userId)))
        .returning();

    return entry ?? null;
}

export async function deleteIncome(db: Db, userId: string, incomeId: string): Promise<boolean> {
    const result = await db
        .delete(monthlyIncome)
        .where(and(eq(monthlyIncome.id, incomeId), eq(monthlyIncome.userId, userId)))
        .returning();

    return result.length > 0;
}

// ─── PDF Paystub Parser ─────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
};

export interface PaystubParseResult {
    year: number;
    month: number;
    netPay: number;
    source: string;
}

/**
 * Extract month, year, NET PAY from a paystub PDF buffer.
 *
 * Supports BlackRock-style payslips with:
 * - "Payslip for the Month of <Month>-<Year>"
 * - NET PAY on the standalone line before "Bank-Transfer"
 */
export async function parsePaystubPdf(buffer: Buffer | ArrayBuffer): Promise<PaystubParseResult> {
    // pdf-parse v1.x is CJS-only — import lib directly to avoid
    // index.js test-file bug (ENOENT: 05-versions-space.pdf)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const buf = buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer));
    const data = await pdfParse(buf);
    const text: string = data.text;

    // Extract month/year from "Payslip for the Month of <Month>-<Year>"
    const monthMatch = text.match(/Payslip for the Month of\s+(\w+)-(\d{4})/i);
    if (!monthMatch) {
        throw new Error(
            "Could not find month/year in paystub. Expected 'Payslip for the Month of <Month>-<Year>'"
        );
    }

    const monthName = monthMatch[1].toLowerCase();
    const year = parseInt(monthMatch[2], 10);
    const month = MONTH_MAP[monthName];
    if (!month) {
        throw new Error(`Unknown month "${monthMatch[1]}" in paystub`);
    }

    // Extract NET PAY — standalone number on the line before "Bank-Transfer"
    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    let netPay: number | null = null;

    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i + 1].startsWith("Bank-Transfer") || lines[i + 1].startsWith("Bank")) {
            const numMatch = lines[i].match(/^(\d+(?:,\d+)*\.\d{2})$/);
            if (numMatch) {
                netPay = parseFloat(numMatch[1].replace(/,/g, ""));
            }
        }
    }

    if (netPay === null) {
        // Fallback: find number between NET PAY label and Bank-Transfer
        const netPayIdx = text.indexOf("NET PAY");
        const bankIdx = text.indexOf("Bank-Transfer");
        if (netPayIdx !== -1 && bankIdx !== -1) {
            const between = text.substring(netPayIdx, bankIdx);
            const nums = between.match(/\n(\d+(?:,\d+)*\.\d{2})\n/g);
            if (nums) {
                const last = nums[nums.length - 1].trim();
                netPay = parseFloat(last.replace(/,/g, ""));
            }
        }
    }

    if (netPay === null) {
        throw new Error("Could not extract NET PAY from paystub");
    }

    // Determine source from content
    const isBonus = /bonus/i.test(text) && !/Basic Salary/i.test(text) && !/House Rent/i.test(text);
    const source = isBonus ? "bonus" : "salary";

    return { year, month, netPay, source };
}
