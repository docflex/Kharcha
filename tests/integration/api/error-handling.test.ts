// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * Integration tests for error handling in API routes.
 * Verifies that handleApiError returns proper HTTP status codes,
 * JSON format, and logs with context.
 */
describe("API Error Handling — Response Integration", () => {
    it("returns 409 for unique constraint violations", async () => {
        const err = new Error("duplicate key value violates unique constraint");
        const res = handleApiError(err, { route: "/api/categories", method: "POST" });
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.code).toBe("DUPLICATE");
        expect(body.error).toContain("already exists");
    });

    it("returns 400 for foreign key violations", async () => {
        const err = new Error("violates foreign key constraint on table expenses");
        const res = handleApiError(err, { route: "/api/expenses", method: "POST" });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.code).toBe("FK_VIOLATION");
    });

    it("returns 400 for Zod validation errors", async () => {
        const err = new Error("Validation failed: required field missing");
        err.name = "ZodError";
        const res = handleApiError(err, { route: "/api/expenses", method: "POST" });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 503 for DB connection errors", async () => {
        const err = new Error("Failed query: connect ECONNREFUSED");
        err.name = "NeonDbError";
        const res = handleApiError(err, { route: "/api/expenses", method: "GET" });
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.code).toBe("DB_CONNECTION_FAILED");
    });

    it("returns 500 for unknown errors with fallback message", async () => {
        const err = new Error("Some internal detail");
        const res = handleApiError(
            err,
            { route: "/api/budgets", method: "DELETE" },
            "Failed to delete budget"
        );
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe("Failed to delete budget");
        expect(body.code).toBe("INTERNAL_ERROR");
    });

    it("logs full error context to console.error", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            const err = new Error("DB crash during query");
            err.name = "NeonDbError";

            handleApiError(err, {
                route: "/api/income",
                method: "POST",
                userId: "user-12345678-abcd",
            });

            expect(spy).toHaveBeenCalled();
            const firstArg = spy.mock.calls[0][0] as string;
            expect(firstArg).toContain("[POST]");
            expect(firstArg).toContain("/api/income");
            expect(firstArg).toContain("user-123");
            expect(firstArg).toContain("DB_ERROR");
        } finally {
            spy.mockRestore();
        }
    });

    it("does not log stack for validation errors", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            const err = new Error("Invalid JSON parse error");
            err.name = "ZodError";

            handleApiError(err, { route: "/api/test", method: "POST" });

            // Should only have 1 call (error message), NOT a second call for stack
            const stackCalls = spy.mock.calls.filter(
                (call) => typeof call[0] === "string" && call[0].includes("Stack:")
            );
            expect(stackCalls).toHaveLength(0);
        } finally {
            spy.mockRestore();
        }
    });

    it("response body always has error and code properties", async () => {
        const cases = [
            new Error("timeout on query"),
            new Error("fetch failed"),
            "string error",
            null,
        ];

        for (const err of cases) {
            const res = handleApiError(err, { route: "/api/test" });
            const body = await res.json();
            expect(body).toHaveProperty("error");
            expect(body).toHaveProperty("code");
            expect(typeof body.error).toBe("string");
            expect(typeof body.code).toBe("string");
        }
    });
});
