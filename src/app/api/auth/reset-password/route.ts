import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resetPassword } from "@/lib/services/password-reset-service";
import { resetPasswordSchema } from "@/lib/utils/validators";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, password } = resetPasswordSchema.parse(body);

        const result = await resetPassword(db, token, password);

        if (!result.success) {
            return Response.json({ error: result.error }, { status: 400 });
        }

        return Response.json({
            message: "Password has been reset successfully. You can now sign in.",
        });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/auth/reset-password",
            method: "POST",
        });
    }
}
