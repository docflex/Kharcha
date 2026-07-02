import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { changePassword } from "@/lib/services/user-service";
import { changePasswordSchema } from "@/lib/utils/validators";
import { logAuditAction } from "@/lib/services/audit-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const parsed = changePasswordSchema.parse(body);

        const result = await changePassword(
            db,
            session.user.id,
            parsed.currentPassword,
            parsed.newPassword
        );

        if (!result.success) {
            return Response.json({ error: result.error }, { status: 400 });
        }

        await logAuditAction(
            db,
            session.user.id,
            "password_change",
            undefined,
            request.headers.get("x-forwarded-for") || undefined
        );
        return Response.json({ message: "Password changed successfully" });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/user/password",
            method: "POST",
            userId: session.user.id,
        });
    }
}
