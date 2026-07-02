import { eq, and, inArray } from "drizzle-orm";
import { expenses } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/utils/validators";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

interface CreateExpenseInput {
    categoryId: string;
    year: number;
    month: number;
    amount: number;
    source?: "manual" | "ocr" | "import";
    confidence?: number;
    notes?: string;
}

interface GetExpensesFilter {
    year?: number;
    month?: number;
    categoryId?: string;
}

interface UpdateExpenseInput {
    categoryId?: string;
    year?: number;
    month?: number;
    amount?: number;
    source?: "manual" | "ocr" | "import";
    confidence?: number;
    notes?: string;
}

export async function createExpense(db: Db, userId: string, input: CreateExpenseInput) {
    const parsed = createExpenseSchema.parse(input);

    const id = uuid();
    const now = new Date();

    const [expense] = await db
        .insert(expenses)
        .values({
            id,
            userId,
            categoryId: parsed.categoryId,
            year: parsed.year,
            month: parsed.month,
            amount: parsed.amount,
            source: parsed.source || "manual",
            confidence: parsed.confidence,
            notes: parsed.notes,
            createdAt: now,
            updatedAt: now,
        })
        .returning();

    return expense;
}

export async function getExpenses(db: Db, userId: string, filter?: GetExpensesFilter) {
    const conditions = [eq(expenses.userId, userId)];

    if (filter?.year) {
        conditions.push(eq(expenses.year, filter.year));
    }
    if (filter?.month) {
        conditions.push(eq(expenses.month, filter.month));
    }
    if (filter?.categoryId) {
        conditions.push(eq(expenses.categoryId, filter.categoryId));
    }

    return db
        .select()
        .from(expenses)
        .where(and(...conditions));
}

export async function getExpenseById(db: Db, userId: string, id: string) {
    const [result] = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

    return result || null;
}

export async function updateExpense(db: Db, userId: string, id: string, input: UpdateExpenseInput) {
    const parsed = updateExpenseSchema.parse(input);

    // Check ownership
    const existing = await getExpenseById(db, userId, id);
    if (!existing) return null;

    const [updated] = await db
        .update(expenses)
        .set({
            ...parsed,
            updatedAt: new Date(),
        })
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();

    return updated || null;
}

export async function deleteExpense(db: Db, userId: string, id: string): Promise<boolean> {
    const result = await db
        .delete(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();

    return result.length > 0;
}

export async function bulkDeleteExpenses(db: Db, userId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db
        .delete(expenses)
        .where(and(eq(expenses.userId, userId), inArray(expenses.id, ids)))
        .returning();

    return result.length;
}

export async function bulkUpdateExpenses(
    db: Db,
    userId: string,
    ids: string[],
    data: { categoryId: string }
): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db
        .update(expenses)
        .set({ categoryId: data.categoryId, updatedAt: new Date() })
        .where(and(eq(expenses.userId, userId), inArray(expenses.id, ids)))
        .returning();

    return result.length;
}
