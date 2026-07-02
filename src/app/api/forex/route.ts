import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getRate, getAllRates } from "@/lib/services/forex-service";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { cacheGet, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "INR";
    const to = searchParams.get("to");
    const all = searchParams.get("all");

    try {
        // Batch: get all rates at once
        if (all === "true") {
            const data = await cacheGet(
                `forex:${from}:all`,
                async () => {
                    const targets = SUPPORTED_CURRENCIES.map((c) => c.code).filter(
                        (c) => c !== from
                    );
                    const rates = await getAllRates(db, from, targets);
                    rates[from] = 1;
                    return { base: from, rates };
                },
                { ttl: TTL.DAY, tags: ["forex"] }
            );
            return Response.json({ data });
        }

        // Single rate
        if (!to) {
            return Response.json({ error: "Missing 'to' parameter" }, { status: 400 });
        }

        const result = await cacheGet(`forex:${from}:${to}`, () => getRate(db, from, to), {
            ttl: TTL.DAY,
            tags: ["forex"],
        });
        return Response.json({ data: result });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/forex",
            method: "GET",
            userId: session.user.id,
        });
    }
}
