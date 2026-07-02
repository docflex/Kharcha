import { describe, it, expect, vi } from "vitest";
import { handleApiError } from "@/lib/utils/api-error";

describe("API Error Classification & Handling", () => {
    // ─── Database errors ────────────────────────────────────────────────

    describe("classifyError — DB errors", () => {
        it("classifies NeonDbError with 'does not exist' as DB_SCHEMA_MISMATCH (500)", async () => {
            const err = new Error("Failed query: column 'foo' does not exist");
            err.name = "NeonDbError";
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.code).toBe("DB_SCHEMA_MISMATCH");
        });

        it("classifies NeonDbError with 'connect' as DB_CONNECTION_FAILED (503)", async () => {
            const err = new Error("Failed query: connect ECONNREFUSED");
            err.name = "NeonDbError";
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(503);
            const body = await res.json();
            expect(body.code).toBe("DB_CONNECTION_FAILED");
        });

        it("classifies NeonDbError with 'fetch failed' as DB_CONNECTION_FAILED (503)", async () => {
            const err = new Error("fetch failed");
            err.name = "NeonDbError";
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(503);
            const body = await res.json();
            expect(body.code).toBe("DB_CONNECTION_FAILED");
        });

        it("classifies NeonDbError with 'timeout' as DB_TIMEOUT (504)", async () => {
            const err = new Error("query timed out after 30000ms");
            err.name = "NeonDbError";
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(504);
            const body = await res.json();
            expect(body.code).toBe("DB_TIMEOUT");
        });

        it("classifies generic NeonDbError as DB_ERROR (500)", async () => {
            const err = new Error("Failed query: some other db problem");
            err.name = "NeonDbError";
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.code).toBe("DB_ERROR");
        });
    });

    // ─── Constraint violations ──────────────────────────────────────────

    describe("classifyError — constraint violations", () => {
        it("classifies UNIQUE constraint as DUPLICATE (409)", async () => {
            const err = new Error("UNIQUE constraint failed: categories.name");
            const res = handleApiError(err, { route: "/api/categories" });
            expect(res.status).toBe(409);
            const body = await res.json();
            expect(body.code).toBe("DUPLICATE");
        });

        it("classifies 'duplicate key' as DUPLICATE (409)", async () => {
            const err = new Error("duplicate key value violates unique constraint");
            const res = handleApiError(err, { route: "/api/categories" });
            expect(res.status).toBe(409);
            const body = await res.json();
            expect(body.code).toBe("DUPLICATE");
        });

        it("classifies foreign key violation as FK_VIOLATION (400)", async () => {
            const err = new Error("violates foreign key constraint");
            const res = handleApiError(err, { route: "/api/expenses" });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("FK_VIOLATION");
        });
    });

    // ─── Validation / parse errors ──────────────────────────────────────

    describe("classifyError — validation", () => {
        it("classifies ZodError as VALIDATION_ERROR (400)", async () => {
            const err = new Error("Validation failed");
            err.name = "ZodError";
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });

        it("classifies JSON parse error as VALIDATION_ERROR (400)", async () => {
            const err = new Error("Unexpected token in JSON at position 0");
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });
    });

    // ─── Auth errors ────────────────────────────────────────────────────

    describe("classifyError — auth", () => {
        it("classifies Unauthorized as AUTH_REQUIRED (401)", async () => {
            const err = new Error("Unauthorized access");
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.code).toBe("AUTH_REQUIRED");
        });
    });

    // ─── Timeout / Network / TLS ────────────────────────────────────────

    describe("classifyError — timeout, network, TLS", () => {
        it("classifies ETIMEDOUT as TIMEOUT (504)", async () => {
            const err = new Error("connect ETIMEDOUT 10.0.0.1");
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(504);
            const body = await res.json();
            expect(body.code).toBe("TIMEOUT");
        });

        it("classifies ECONNREFUSED as NETWORK_ERROR (503)", async () => {
            const err = new Error("connect ECONNREFUSED 127.0.0.1:5432");
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(503);
            const body = await res.json();
            expect(body.code).toBe("NETWORK_ERROR");
        });

        it("classifies self-signed certificate as TLS_ERROR (503)", async () => {
            const err = new Error("self-signed certificate in certificate chain");
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(503);
            const body = await res.json();
            expect(body.code).toBe("TLS_ERROR");
        });
    });

    // ─── Default / Unknown ──────────────────────────────────────────────

    describe("classifyError — defaults", () => {
        it("classifies non-Error as UNKNOWN (500)", async () => {
            const res = handleApiError("string error", { route: "/api/test" });
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.code).toBe("UNKNOWN");
            expect(body.error).toBe("An unexpected error occurred");
        });

        it("classifies generic Error as INTERNAL_ERROR (500)", async () => {
            const err = new Error("Something weird happened");
            const res = handleApiError(err, { route: "/api/test" });
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.code).toBe("INTERNAL_ERROR");
        });

        it("truncates very long error messages to 200 chars", async () => {
            const err = new Error("x".repeat(300));
            const res = handleApiError(err, { route: "/api/test" });
            const body = await res.json();
            expect(body.error.length).toBeLessThanOrEqual(201); // 200 + "…"
        });
    });

    // ─── handleApiError behavior ────────────────────────────────────────

    describe("handleApiError — response format", () => {
        it("returns JSON with error and code fields", async () => {
            const err = new Error("Test error");
            const res = handleApiError(err, { route: "/api/test" });
            const body = await res.json();
            expect(body).toHaveProperty("error");
            expect(body).toHaveProperty("code");
        });

        it("uses fallbackMessage when provided", async () => {
            const err = new Error("Internal details");
            const res = handleApiError(err, { route: "/api/test" }, "Something went wrong");
            const body = await res.json();
            expect(body.error).toBe("Something went wrong");
        });

        it("logs to console.error with route context", () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            try {
                const err = new Error("DB crash");
                err.name = "NeonDbError";

                handleApiError(err, {
                    route: "/api/expenses",
                    method: "POST",
                    userId: "abc12345-6789",
                });

                expect(spy).toHaveBeenCalled();
                const logCall = spy.mock.calls[0][0] as string;
                expect(logCall).toContain("[POST]");
                expect(logCall).toContain("/api/expenses");
                expect(logCall).toContain("abc12345");
            } finally {
                spy.mockRestore();
            }
        });
    });
});
