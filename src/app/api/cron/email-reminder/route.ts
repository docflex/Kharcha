import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendUploadReminder, isEmailConfigured } from "@/lib/email";
import { monthNumberToName } from "@/lib/utils/dates";

export async function GET(request: Request) {
    // Verify CRON_SECRET to prevent unauthorized triggers
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isEmailConfigured()) {
        return Response.json(
            { data: { sent: 0, message: "Email not configured" } },
            { status: 200 }
        );
    }

    try {
        // Get the current month/year for the reminder target
        const now = new Date();
        const targetMonth = now.getMonth() + 1; // 1-indexed
        const targetYear = now.getFullYear();
        const monthName = monthNumberToName(targetMonth) || "Unknown";
        const appUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

        // Fetch all users
        const allUsers = await db.select().from(users);

        const results: Array<{ userId: string; success: boolean; error?: string }> = [];

        for (const user of allUsers) {
            try {
                const result = await sendUploadReminder(db, user.id, {
                    userName: user.name,
                    userEmail: user.email,
                    targetMonth: monthName,
                    targetYear: targetYear,
                    appUrl,
                });
                results.push({
                    userId: user.id,
                    success: result.success,
                    error: result.error,
                });
            } catch (error) {
                results.push({
                    userId: user.id,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        const sent = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        console.log(
            `[Cron] Email reminder: ${sent} sent, ${failed} failed out of ${allUsers.length} users`
        );

        return Response.json({
            data: {
                sent,
                failed,
                total: allUsers.length,
                results,
            },
        });
    } catch (error) {
        console.error("[Cron] Email reminder failed:", error);
        return Response.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
