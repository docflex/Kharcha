/**
 * Centralized API error handling — classifies errors, logs server-side, returns specific messages.
 */

type ErrorContext = {
    route: string;
    method?: string;
    userId?: string;
};

type ClassifiedError = {
    message: string;
    status: number;
    code: string;
};

function classifyError(error: unknown): ClassifiedError {
    if (!(error instanceof Error)) {
        return {
            message: "An unexpected error occurred",
            status: 500,
            code: "UNKNOWN",
        };
    }

    const msg = error.message;
    const name = error.name;

    // ─── Database errors ────────────────────────────────────────────────
    if (name === "NeonDbError" || msg.includes("Failed query")) {
        if (msg.includes("does not exist")) {
            return {
                message:
                    "Database schema mismatch — a required column or table is missing. Run migrations.",
                status: 500,
                code: "DB_SCHEMA_MISMATCH",
            };
        }
        if (msg.includes("connect") || msg.includes("fetch failed")) {
            return {
                message: "Database connection failed — check DATABASE_URL and network connectivity",
                status: 503,
                code: "DB_CONNECTION_FAILED",
            };
        }
        if (msg.includes("timeout") || msg.includes("timed out")) {
            return {
                message: "Database query timed out — please try again",
                status: 504,
                code: "DB_TIMEOUT",
            };
        }
        return {
            message: `Database error: ${msg.slice(0, 200)}`,
            status: 500,
            code: "DB_ERROR",
        };
    }

    // ─── Constraint violations ──────────────────────────────────────────
    if (msg.includes("UNIQUE") || msg.includes("unique") || msg.includes("duplicate key")) {
        return {
            message: "A record with this value already exists",
            status: 409,
            code: "DUPLICATE",
        };
    }

    if (
        msg.includes("foreign key") ||
        msg.includes("FOREIGN KEY") ||
        msg.includes("violates foreign key")
    ) {
        return {
            message: "Referenced record not found — the linked item may have been deleted",
            status: 400,
            code: "FK_VIOLATION",
        };
    }

    // ─── Validation / parse errors ──────────────────────────────────────
    if (
        msg.includes("parse") ||
        msg.includes("JSON") ||
        msg.includes("SyntaxError") ||
        name === "ZodError"
    ) {
        return {
            message: "Invalid request data — check required fields and formats",
            status: 400,
            code: "VALIDATION_ERROR",
        };
    }

    // ─── Auth errors ────────────────────────────────────────────────────
    if (msg.includes("Unauthorized") || msg.includes("unauthorized")) {
        return {
            message: "Authentication required — please sign in again",
            status: 401,
            code: "AUTH_REQUIRED",
        };
    }

    // ─── Timeout errors ─────────────────────────────────────────────────
    if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
        return {
            message: "Request timed out — please try again",
            status: 504,
            code: "TIMEOUT",
        };
    }

    // ─── Network / fetch errors ─────────────────────────────────────────
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
        return {
            message: "Network error — unable to reach external service",
            status: 503,
            code: "NETWORK_ERROR",
        };
    }

    // ─── Certificate / TLS errors ───────────────────────────────────────
    if (
        msg.includes("certificate") ||
        msg.includes("TLS") ||
        msg.includes("SSL") ||
        msg.includes("self-signed")
    ) {
        return {
            message:
                "TLS/SSL error — certificate verification failed (try NODE_TLS_REJECT_UNAUTHORIZED=0 for dev)",
            status: 503,
            code: "TLS_ERROR",
        };
    }

    // ─── Default ────────────────────────────────────────────────────────
    return {
        message: msg.length > 200 ? msg.slice(0, 200) + "…" : msg,
        status: 500,
        code: "INTERNAL_ERROR",
    };
}

/**
 * Handle an API route error: log it server-side with context, return classified Response.
 *
 * @param error - The caught error
 * @param context - Route context for logging
 * @param fallbackMessage - Optional override for user-facing message (the real error is still logged)
 */
export function handleApiError(
    error: unknown,
    context: ErrorContext,
    fallbackMessage?: string
): Response {
    const classified = classifyError(error);

    // Always log the full error server-side
    const logPrefix = `[${context.method || "?"}] ${context.route}`;
    const userId = context.userId ? ` (user: ${context.userId.slice(0, 8)}…)` : "";
    console.error(
        `${logPrefix}${userId} [${classified.code}]:`,
        error instanceof Error ? error.message : error
    );
    if (error instanceof Error && error.stack && classified.code !== "VALIDATION_ERROR") {
        console.error(`${logPrefix} Stack:`, error.stack.split("\n").slice(0, 5).join("\n"));
    }

    return Response.json(
        {
            error: fallbackMessage || classified.message,
            code: classified.code,
        },
        { status: classified.status }
    );
}
