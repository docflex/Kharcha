import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { parsePaystubPdf, upsertIncome } from "@/lib/services/income-service";
import { cacheInvalidateByTags } from "@/lib/cache";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return Response.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
            return Response.json({ error: "File must be a PDF" }, { status: 400 });
        }

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            return Response.json({ error: "File exceeds 5MB limit" }, { status: 400 });
        }

        // Parse the PDF
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await parsePaystubPdf(buffer);

        // Create the income entry
        const entry = await upsertIncome(db, session.user.id, {
            year: parsed.year,
            month: parsed.month,
            amount: parsed.netPay,
            source: parsed.source,
        });

        cacheInvalidateByTags(["income", session.user.id]);
        cacheInvalidateByTags(["sparkline", session.user.id]);
        cacheInvalidateByTags(["analytics", session.user.id]);

        return Response.json(
            {
                data: {
                    ...entry,
                    parsed: {
                        year: parsed.year,
                        month: parsed.month,
                        netPay: parsed.netPay,
                        source: parsed.source,
                    },
                },
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, {
            route: "/api/income/upload",
            method: "POST",
            userId: session.user.id,
        });
    }
}
