import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import { compare, hash } from "bcryptjs";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

type ProfileResult = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    defaultMonthlyIncome: number | null;
    preferredCurrency: string | null;
    hasPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
};

// ─── Get Profile ────────────────────────────────────────────────────────────

export async function getProfile(db: Db, userId: string): Promise<ProfileResult | null> {
    const [user] = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            defaultMonthlyIncome: users.defaultMonthlyIncome,
            preferredCurrency: users.preferredCurrency,
            passwordHash: users.passwordHash,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId));

    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        defaultMonthlyIncome: user.defaultMonthlyIncome,
        preferredCurrency: user.preferredCurrency,
        hasPassword: !!user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

// ─── Update Profile ─────────────────────────────────────────────────────────

export async function updateProfile(
    db: Db,
    userId: string,
    data: {
        name?: string;
        preferredCurrency?: string;
        defaultMonthlyIncome?: number;
    }
): Promise<ProfileResult | null> {
    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) return null;

    await db
        .update(users)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    return getProfile(db, userId);
}

// ─── Change Password ────────────────────────────────────────────────────────

export async function changePassword(
    db: Db,
    userId: string,
    currentPassword: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
        return { success: false, error: "User not found" };
    }

    if (!user.passwordHash) {
        return { success: false, error: "Account uses OAuth, no password set" };
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
        return { success: false, error: "Current password is incorrect" };
    }

    const newHash = await hash(newPassword, 12);
    const now = new Date();
    await db
        .update(users)
        .set({
            passwordHash: newHash,
            passwordChangedAt: now,
            updatedAt: now,
        })
        .where(eq(users.id, userId));

    return { success: true };
}
