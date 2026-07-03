import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
    sendUploadReminder,
    sendDashboardReady,
    getEmailLog,
    isEmailConfigured,
    verifyConnection,
} from "@/lib/email";
import { monthNumberToName } from "@/lib/utils/dates";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    try {
        if (action === "status") {
            const configured = isEmailConfigured();
            let connected = false;
            if (configured) {
                connected = await verifyConnection();
            }
            return Response.json({
                data: { configured, connected },
            });
        }

        if (action === "log") {
            const type = searchParams.get("type") as
                "upload_reminder" | "dashboard_ready" | undefined;
            const logs = await getEmailLog(db, session.user.id, type || undefined);
            return Response.json({ data: logs });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/email",
            method: "GET",
            userId: session.user.id,
        });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { type, year, month } = body;

        if (!type || !year || !month) {
            return Response.json(
                { error: "Missing required fields: type, year, month" },
                { status: 400 }
            );
        }

        if (!isEmailConfigured()) {
            return Response.json(
                { error: "Email is not configured. Set SMTP_* environment variables." },
                { status: 503 }
            );
        }

        // Fetch user info
        const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
        if (!user) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        const appUrl = process.env.AUTH_URL || "http://localhost:3000";
        const monthName = monthNumberToName(month) || "Unknown";

        if (type === "upload_reminder") {
            const result = await sendUploadReminder(db, session.user.id, {
                userName: user.name,
                userEmail: user.email,
                targetMonth: monthName,
                targetYear: year,
                appUrl,
            });
            return Response.json({ data: result });
        }

        if (type === "dashboard_ready") {
            const result = await sendDashboardReady(db, session.user.id, {
                userName: user.name,
                userEmail: user.email,
                month: monthName,
                year,
                appUrl,
                totalSpend: body.totalSpend || 0,
                topCategories: body.topCategories || [],
                savingsRate: body.savingsRate || 0,
                personaName: body.personaName,
                personaEmoji: body.personaEmoji,
            });
            return Response.json({ data: result });
        }

        return Response.json({ error: "Invalid email type" }, { status: 400 });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/email",
            method: "POST",
            userId: session.user.id,
        });
    }
}
