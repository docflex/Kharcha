import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, categories } from "@/lib/db/schema";
import { registerSchema } from "@/lib/utils/validators";
import { handleApiError } from "@/lib/utils/api-error";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = registerSchema.parse(body);

        // Check if user already exists
        const [existing] = await db.select().from(users).where(eq(users.email, parsed.email));

        if (existing) {
            return Response.json({ error: "Email already registered" }, { status: 409 });
        }

        const userId = uuid();
        const passwordHash = await hash(parsed.password, 12);
        const now = new Date();

        // Create user
        await db.insert(users).values({
            id: userId,
            name: parsed.name,
            email: parsed.email,
            passwordHash,
            createdAt: now,
            updatedAt: now,
        });

        // Seed default categories
        for (const cat of DEFAULT_CATEGORIES) {
            await db.insert(categories).values({
                id: uuid(),
                userId,
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                color: cat.color,
                createdAt: now,
            });
        }

        return Response.json({ message: "Account created", data: { id: userId } }, { status: 201 });
    } catch (error) {
        return handleApiError(error, { route: "/api/auth/register", method: "POST" });
    }
}
