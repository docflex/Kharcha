import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createResetToken } from "@/lib/services/password-reset-service";
import { sendPasswordReset } from "@/lib/email/service";
import { isEmailConfigured } from "@/lib/email/client";
import { forgotPasswordSchema } from "@/lib/utils/validators";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = forgotPasswordSchema.parse(body);

        // Always return success to prevent email enumeration
        const genericResponse = Response.json({
            message: "If an account exists with that email, a password reset link has been sent.",
        });

        if (!isEmailConfigured()) {
            console.warn("[forgot-password] Email not configured, skipping");
            return genericResponse;
        }

        const result = await createResetToken(db, email);
        if (!result) {
            // User not found or OAuth-only — don't reveal this
            return genericResponse;
        }

        // Get user name for the email
        const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, result.userId));

        const appUrl = process.env.AUTH_URL || process.env.APP_URL || "http://localhost:3000";
        const resetUrl = `${appUrl}/auth/reset-password?token=${result.token}`;

        await sendPasswordReset(db, result.userId, {
            userName: user?.name || "User",
            userEmail: email,
            resetUrl,
        });

        return genericResponse;
    } catch (error) {
        return handleApiError(error, {
            route: "/api/auth/forgot-password",
            method: "POST",
        });
    }
}
