import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { deleteUserAccount } from "@/lib/services/danger-zone-service";
import { cacheClear } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

export async function DELETE() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await deleteUserAccount(db, session.user.id);
        cacheClear();

        return Response.json({ message: "Account deleted successfully" });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/user/account",
            method: "DELETE",
            userId: session.user.id,
        });
    }
}
