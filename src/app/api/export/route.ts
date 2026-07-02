import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { expenses, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { exportToExcel } from "@/lib/export/excel";
import { exportToCsv } from "@/lib/export/csv";
import { logAuditAction } from "@/lib/services/audit-service";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format") || "xlsx";
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;

    try {
        // Build query conditions
        const conditions = [eq(expenses.userId, session.user.id)];
        if (year) conditions.push(eq(expenses.year, year));
        if (month) conditions.push(eq(expenses.month, month));

        // Fetch expenses with category names
        const rows = await db
            .select({
                year: expenses.year,
                month: expenses.month,
                category: categories.name,
                amount: expenses.amount,
            })
            .from(expenses)
            .innerJoin(categories, eq(expenses.categoryId, categories.id))
            .where(and(...conditions));

        const data = { expenses: rows };

        await logAuditAction(
            db,
            session.user.id,
            "data_export",
            { format, year, month, rowCount: rows.length },
            request.headers.get("x-forwarded-for") || undefined
        );

        if (format === "csv") {
            const csv = exportToCsv(data);
            return new Response(csv, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="kharcha-export${year ? `-${year}` : ""}${month ? `-${month}` : ""}.csv"`,
                },
            });
        }

        // Default: Excel
        const buffer = await exportToExcel(data);
        return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="kharcha-export${year ? `-${year}` : ""}${month ? `-${month}` : ""}.xlsx"`,
            },
        });
    } catch (error) {
        return handleApiError(error, {
            route: "/api/export",
            method: "GET",
            userId: session.user.id,
        });
    }
}
