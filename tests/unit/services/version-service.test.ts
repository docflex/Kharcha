// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser } from "@/lib/db/test-utils";
import { getDataVersion, bumpDataVersion } from "@/lib/services/version-service";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
});

afterAll(async () => {
    await testDb.cleanup();
});

describe("Version Service", () => {
    it("returns 0 for a new user", async () => {
        const version = await getDataVersion(testDb.db, userId);
        expect(version).toBe(0);
    });

    it("bumps version by 1", async () => {
        const newVersion = await bumpDataVersion(testDb.db, userId);
        expect(newVersion).toBe(1);
    });

    it("bumps version incrementally", async () => {
        const v2 = await bumpDataVersion(testDb.db, userId);
        expect(v2).toBe(2);

        const v3 = await bumpDataVersion(testDb.db, userId);
        expect(v3).toBe(3);
    });

    it("getDataVersion reflects bumped value", async () => {
        const version = await getDataVersion(testDb.db, userId);
        expect(version).toBe(3);
    });

    it("tracks versions independently per user", async () => {
        const otherUserId = await seedTestUser(testDb.db, {
            email: "other@kharcha.app",
            name: "Other User",
        });

        const otherVersion = await getDataVersion(testDb.db, otherUserId);
        expect(otherVersion).toBe(0);

        await bumpDataVersion(testDb.db, otherUserId);
        const otherV1 = await getDataVersion(testDb.db, otherUserId);
        expect(otherV1).toBe(1);

        // Original user's version unchanged
        const originalVersion = await getDataVersion(testDb.db, userId);
        expect(originalVersion).toBe(3);
    });

    it("returns 0 for non-existent user", async () => {
        const version = await getDataVersion(testDb.db, "nonexistent-id");
        expect(version).toBe(0);
    });

    it("concurrent bumps produce sequential increments", async () => {
        const startVersion = await getDataVersion(testDb.db, userId);

        // Run 3 bumps concurrently
        const results = await Promise.all([
            bumpDataVersion(testDb.db, userId),
            bumpDataVersion(testDb.db, userId),
            bumpDataVersion(testDb.db, userId),
        ]);

        // All 3 should succeed (exact order may vary)
        expect(results).toHaveLength(3);

        const endVersion = await getDataVersion(testDb.db, userId);
        expect(endVersion).toBe(startVersion + 3);
    });

    it("bump returns the new version (not old)", async () => {
        const before = await getDataVersion(testDb.db, userId);
        const bumped = await bumpDataVersion(testDb.db, userId);
        expect(bumped).toBe(before + 1);
    });
});
