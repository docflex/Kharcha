import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getDataVersion } from "@/lib/services/version-service";
import { handleApiError } from "@/lib/utils/api-error";
import { version } from "os";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ data: { version: 0 } }, { status: 401 });
    }

    try {
        const version = await getDataVersion(db, session.user.id);
        return Response.json({ data: { version } });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/version",
            method: "GET",
            userId: session.user.id,
        });
    }
}
