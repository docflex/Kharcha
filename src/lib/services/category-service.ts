import { eq, and, sql } from "drizzle-orm";
import { categories, expenses } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { createCategorySchema, updateCategorySchema } from "@/lib/utils/validators";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

interface CreateCategoryInput {
    name: string;
    icon?: string;
    color?: string;
    type?: "expense" | "investment";
    parentId?: string;
    sortOrder?: number;
}

interface GetCategoriesFilter {
    type?: "expense" | "investment";
}

interface UpdateCategoryInput {
    name?: string;
    icon?: string;
    color?: string;
    type?: "expense" | "investment";
    parentId?: string;
    sortOrder?: number;
}

export async function createCategory(db: Db, userId: string, input: CreateCategoryInput) {
    const parsed = createCategorySchema.parse(input);

    const id = uuid();

    const [category] = await db
        .insert(categories)
        .values({
            id,
            userId,
            name: parsed.name,
            icon: parsed.icon,
            color: parsed.color,
            type: parsed.type || "expense",
            parentId: parsed.parentId,
            sortOrder: parsed.sortOrder ?? 0,
            createdAt: new Date(),
        })
        .returning();

    return category;
}

export async function getCategories(db: Db, userId: string, filter?: GetCategoriesFilter) {
    const conditions = [eq(categories.userId, userId)];

    if (filter?.type) {
        conditions.push(eq(categories.type, filter.type));
    }

    return db
        .select()
        .from(categories)
        .where(and(...conditions));
}

export async function getCategoryById(db: Db, userId: string, id: string) {
    const [result] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    return result || null;
}

export async function updateCategory(
    db: Db,
    userId: string,
    id: string,
    input: UpdateCategoryInput
) {
    const parsed = updateCategorySchema.parse(input);

    const existing = await getCategoryById(db, userId, id);
    if (!existing) return null;

    const [updated] = await db
        .update(categories)
        .set(parsed)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .returning();

    return updated || null;
}

export async function deleteCategory(db: Db, userId: string, id: string): Promise<boolean> {
    const result = await db
        .delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .returning();

    return result.length > 0;
}

// ─── Category Usage Stats ───────────────────────────────────────────────────

export async function getCategoryStats(db: Db, userId: string) {
    const rows = await db
        .select({
            categoryId: expenses.categoryId,
            count: sql<number>`count(*)::int`,
            totalAmount: sql<number>`coalesce(sum(${expenses.amount}), 0)::float`,
        })
        .from(expenses)
        .where(eq(expenses.userId, userId))
        .groupBy(expenses.categoryId);

    return rows;
}

// ─── Resolve Category Names to IDs ──────────────────────────────────────────

/**
 * Resolve category names to IDs for committing OCR entries.
 * If a category doesn't exist for the user, it is created on the fly.
 */
export async function resolveCategoryIds(
    db: Db,
    userId: string,
    entries: Array<{ categoryName: string; amount: number; confidence: number }>
): Promise<Array<{ categoryId: string; amount: number; confidence: number }>> {
    // Cache lookups to avoid repeated queries for the same name
    const nameToId = new Map<string, string>();

    // Pre-load all user categories
    const userCategories = await getCategories(db, userId);
    for (const cat of userCategories) {
        nameToId.set(cat.name.toLowerCase(), cat.id);
    }

    const resolved: Array<{ categoryId: string; amount: number; confidence: number }> = [];

    for (const entry of entries) {
        const key = entry.categoryName.toLowerCase();
        let categoryId = nameToId.get(key);

        if (!categoryId) {
            // Create the category on the fly
            const newCat = await createCategory(db, userId, {
                name: entry.categoryName,
                type: "expense",
            });
            categoryId = newCat.id;
            nameToId.set(key, categoryId);
        }

        resolved.push({
            categoryId,
            amount: entry.amount,
            confidence: entry.confidence,
        });
    }

    return resolved;
}
