// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import { getProfile, updateProfile, changePassword } from "@/lib/services/user-service";

describe("User Service", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db, {
            name: "Raza Moin",
            email: "raza@kharcha.app",
            password: "password123",
        });
    });

    afterEach(async () => await cleanup());

    // ─── getProfile ─────────────────────────────────────────────────────────

    describe("getProfile", () => {
        it("returns user profile by ID", async () => {
            const profile = await getProfile(db, userId);
            expect(profile).not.toBeNull();
            expect(profile!.name).toBe("Raza Moin");
            expect(profile!.email).toBe("raza@kharcha.app");
        });

        it("does not include passwordHash", async () => {
            const profile = await getProfile(db, userId);
            expect(profile).not.toHaveProperty("passwordHash");
        });

        it("returns null for non-existent user", async () => {
            const profile = await getProfile(db, "non-existent-id");
            expect(profile).toBeNull();
        });

        it("includes preferredCurrency and defaultMonthlyIncome", async () => {
            const profile = await getProfile(db, userId);
            expect(profile).toHaveProperty("preferredCurrency");
            expect(profile).toHaveProperty("defaultMonthlyIncome");
        });
    });

    // ─── updateProfile ──────────────────────────────────────────────────────

    describe("updateProfile", () => {
        it("updates name", async () => {
            const updated = await updateProfile(db, userId, { name: "New Name" });
            expect(updated!.name).toBe("New Name");
        });

        it("updates preferredCurrency", async () => {
            const updated = await updateProfile(db, userId, { preferredCurrency: "USD" });
            expect(updated!.preferredCurrency).toBe("USD");
        });

        it("updates defaultMonthlyIncome", async () => {
            const updated = await updateProfile(db, userId, { defaultMonthlyIncome: 150000 });
            expect(updated!.defaultMonthlyIncome).toBe(150000);
        });

        it("updates multiple fields at once", async () => {
            const updated = await updateProfile(db, userId, {
                name: "Updated",
                preferredCurrency: "EUR",
                defaultMonthlyIncome: 200000,
            });
            expect(updated!.name).toBe("Updated");
            expect(updated!.preferredCurrency).toBe("EUR");
            expect(updated!.defaultMonthlyIncome).toBe(200000);
        });

        it("returns null for non-existent user", async () => {
            const result = await updateProfile(db, "fake-id", { name: "Test" });
            expect(result).toBeNull();
        });

        it("does not return passwordHash after update", async () => {
            const updated = await updateProfile(db, userId, { name: "Safe" });
            expect(updated).not.toHaveProperty("passwordHash");
        });

        it("sets updatedAt on update", async () => {
            const updated = await updateProfile(db, userId, { name: "Timestamp Check" });
            expect(updated!.updatedAt).toBeInstanceOf(Date);
            expect(updated!.updatedAt.getTime()).toBeGreaterThan(0);
        });
    });

    // ─── changePassword ─────────────────────────────────────────────────────

    describe("changePassword", () => {
        it("changes password with correct current password", async () => {
            const result = await changePassword(db, userId, "password123", "newpassword456");
            expect(result.success).toBe(true);
        });

        it("fails with incorrect current password", async () => {
            const result = await changePassword(db, userId, "wrongpassword", "newpassword456");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Current password is incorrect");
        });

        it("allows login with new password after change", async () => {
            await changePassword(db, userId, "password123", "newpassword456");
            // Try changing again with the new password
            const result = await changePassword(db, userId, "newpassword456", "anotherpassword");
            expect(result.success).toBe(true);
        });

        it("returns error for non-existent user", async () => {
            const result = await changePassword(db, "fake-id", "password123", "newpassword");
            expect(result.success).toBe(false);
            expect(result.error).toBe("User not found");
        });
    });

    // ─── Cross-user isolation ───────────────────────────────────────────────

    describe("cross-user isolation", () => {
        it("cannot read another user's profile", async () => {
            const userB = await seedTestUser(db, { email: "b@kharcha.app" });

            const profileA = await getProfile(db, userId);
            const profileB = await getProfile(db, userB);

            expect(profileA!.email).toBe("raza@kharcha.app");
            expect(profileB!.email).toBe("b@kharcha.app");
        });

        it("updating user A does not affect user B", async () => {
            const userB = await seedTestUser(db, { email: "b@kharcha.app", name: "User B" });

            await updateProfile(db, userId, { name: "Changed A" });

            const profileB = await getProfile(db, userB);
            expect(profileB!.name).toBe("User B");
        });
    });
});
