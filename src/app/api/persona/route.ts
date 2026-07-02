import { NextRequest } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { personas } from "@/lib/db/schema";
import { generatePersona } from "@/lib/persona/generator";
import { v4 as uuid } from "uuid";
import { cacheGet, cacheInvalidateByTags, TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

/**
 * GET /api/persona?year=2025&month=6
 *
 * Generates (or retrieves cached) persona for the given month.
 * If ?history=true, returns all personas for the user (timeline).
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;

    const userId = session.user.id;

    // History mode — return all personas sorted by date descending
    if (searchParams.get("history") === "true") {
        try {
            const parsed = await cacheGet(
                `persona:history:${userId}`,
                async () => {
                    const history = await db
                        .select()
                        .from(personas)
                        .where(eq(personas.userId, userId))
                        .orderBy(desc(personas.year), desc(personas.month));

                    return history.map((p) => ({
                        ...p,
                        insights: p.insights ? JSON.parse(p.insights) : [],
                        recommendations: p.recommendations ? JSON.parse(p.recommendations) : [],
                    }));
                },
                { ttl: TTL.LONG, tags: ["persona", userId] }
            );

            return Response.json({ data: parsed });
        } catch (error) {
            return handleApiError(error, {
                route: "/api/persona",
                method: "GET",
                userId: session.user.id,
            });
        }
    }

    // Single month mode
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!yearParam || !monthParam) {
        return Response.json({ error: "year and month are required" }, { status: 400 });
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return Response.json({ error: "Invalid year or month" }, { status: 400 });
    }

    try {
        const result = await cacheGet(
            `persona:${userId}:${year}:${month}`,
            async () => {
                const generated = await generatePersona(db, userId, year, month);

                // Upsert to personas table for DB-level persistence
                const [existing] = await db
                    .select()
                    .from(personas)
                    .where(
                        and(
                            eq(personas.userId, userId),
                            eq(personas.year, year),
                            eq(personas.month, month)
                        )
                    );

                const personaData = {
                    personaName: generated.persona.name,
                    personaEmoji: generated.persona.emoji,
                    totalSpend: generated.metrics.totalSpend,
                    totalIncome: generated.metrics.totalIncome,
                    savingsRate: generated.metrics.savingsRate,
                    momChangePct: generated.metrics.momChangePct,
                    overBudgetCount: generated.metrics.overBudgetCount,
                    underBudgetCount: generated.metrics.underBudgetCount,
                    insights: JSON.stringify(generated.insights),
                    recommendations: JSON.stringify(generated.recommendations),
                };

                if (existing) {
                    await db.update(personas).set(personaData).where(eq(personas.id, existing.id));
                } else {
                    await db.insert(personas).values({
                        id: uuid(),
                        userId,
                        year,
                        month,
                        ...personaData,
                        createdAt: new Date(),
                    });
                }

                return generated;
            },
            { ttl: TTL.LONG, tags: ["persona", userId] }
        );

        return Response.json({ data: result });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/persona",
            method: "GET",
            userId: session.user.id,
        });
    }
}
