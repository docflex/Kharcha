import { NextRequest, NextResponse } from "next/server";
import { authLimiter, registerLimiter, apiLimiter } from "@/lib/middleware/rate-limit";

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only rate-limit API routes
    if (!pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    const ip = getClientIp(request);

    // Registration: 3 / hour per IP
    if (pathname === "/api/auth/register" && request.method === "POST") {
        const result = registerLimiter.check(`register:${ip}`);
        if (!result.allowed) {
            return NextResponse.json(
                { error: "Too many registration attempts. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
                    },
                }
            );
        }
        return NextResponse.next();
    }

    // Auth endpoints (login): 5 / 15 min per IP
    if (pathname.startsWith("/api/auth/") && request.method === "POST") {
        const result = authLimiter.check(`auth:${ip}`);
        if (!result.allowed) {
            return NextResponse.json(
                { error: "Too many login attempts. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
                    },
                }
            );
        }
        return NextResponse.next();
    }

    // General API: 100 / min per IP (user-based requires session parsing, using IP for middleware layer)
    if (pathname.startsWith("/api/")) {
        const result = apiLimiter.check(`api:${ip}`);
        if (!result.allowed) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please slow down." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
                    },
                }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};
