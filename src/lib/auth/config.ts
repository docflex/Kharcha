import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { loginSchema } from "@/lib/utils/validators";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    } as never),
    session: { strategy: "jwt" },
    pages: {
        signIn: "/auth/login",
        newUser: "/onboarding",
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success) return null;

                const { email, password } = parsed.data;

                const [user] = await db.select().from(users).where(eq(users.email, email));

                if (!user || !user.passwordHash) return null;

                const isValid = await compare(password, user.passwordHash);
                if (!isValid) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }

            // Session invalidation: check if password was changed after token was issued
            if (token.id && token.iat) {
                try {
                    const [dbUser] = await db
                        .select({ passwordChangedAt: users.passwordChangedAt })
                        .from(users)
                        .where(eq(users.id, token.id as string));

                    if (dbUser?.passwordChangedAt) {
                        const changedAtSec = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
                        if (changedAtSec > (token.iat as number)) {
                            // Password changed after token issued — force re-auth
                            return { ...token, id: undefined };
                        }
                    }
                } catch (err) {
                    console.error(
                        "[auth][jwt] Session invalidation check failed:",
                        err instanceof Error ? err.message : err
                    );
                    // Don't break the session — just skip the check
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
});
