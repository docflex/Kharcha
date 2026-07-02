import { eq, and, lte, gte, or, isNull } from "drizzle-orm";
import { budgets } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { createBudgetSchema, updateBudgetSchema } from "@/lib/utils/validators";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

interface CreateBudgetInput {
    categoryId: string;
    monthlyLimit: number;
    effectiveFrom: string;
    effectiveUntil?: string;
}

interface UpdateBudgetInput {
    monthlyLimit?: number;
    effectiveFrom?: string;
    effectiveUntil?: string;
}

export async function createBudget(db: Db, userId: string, input: CreateBudgetInput) {
    const parsed = createBudgetSchema.parse(input);

    const id = uuid();

    const [budget] = await db
        .insert(budgets)
        .values({
            id,
            userId,
            categoryId: parsed.categoryId,
            monthlyLimit: parsed.monthlyLimit,
            effectiveFrom: parsed.effectiveFrom,
            effectiveUntil: parsed.effectiveUntil ?? null,
            createdAt: new Date(),
        })
        .returning();

    return budget;
}

export async function getBudgets(db: Db, userId: string) {
    return db.select().from(budgets).where(eq(budgets.userId, userId));
}

/**
 * Get the active budget for a category at a specific month (YYYY-MM).
 * Active means: effectiveFrom <= month AND (effectiveUntil >= month OR effectiveUntil is null).
 */
export async function getActiveBudget(
    db: Db,
    userId: string,
    categoryId: string,
    month: string // 'YYYY-MM'
) {
    const [result] = await db
        .select()
        .from(budgets)
        .where(
            and(
                eq(budgets.userId, userId),
                eq(budgets.categoryId, categoryId),
                lte(budgets.effectiveFrom, month),
                or(isNull(budgets.effectiveUntil), gte(budgets.effectiveUntil, month))
            )
        );

    return result || null;
}

export async function updateBudget(db: Db, userId: string, id: string, input: UpdateBudgetInput) {
    const parsed = updateBudgetSchema.parse(input);

    const [existing] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

    if (!existing) return null;

    const [updated] = await db
        .update(budgets)
        .set(parsed)
        .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
        .returning();

    return updated || null;
}

export async function deleteBudget(db: Db, userId: string, id: string): Promise<boolean> {
    const result = await db
        .delete(budgets)
        .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
        .returning();

    return result.length > 0;
}
