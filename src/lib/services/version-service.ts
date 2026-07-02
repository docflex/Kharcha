import { eq, sql } from "drizzle-orm";
import { users } from "../db/schema";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

/**
 * Get the current data version for a user.
 * Single-column SELECT on primary key — sub-10ms on Neon.
 */
export async function getDataVersion(db: DB, userId: string): Promise<number> {
    const [row] = await db
        .select({ dataVersion: users.dataVersion })
        .from(users)
        .where(eq(users.id, userId));
    return row?.dataVersion ?? 0;
}

/**
 * Increment data_version for a user.
 * Call this after every write mutation (create/update/delete expense, income, category, budget).
 */
export async function bumpDataVersion(db: DB, userId: string): Promise<number> {
    const [row] = await db
        .update(users)
        .set({ dataVersion: sql`${users.dataVersion} + 1` })
        .where(eq(users.id, userId))
        .returning({ dataVersion: users.dataVersion });
    return row?.dataVersion ?? 0;
}
