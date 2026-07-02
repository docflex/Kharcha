/**
 * Creates the password_reset_tokens table in Neon Postgres.
 *
 * Usage:
 *   npx tsx scripts/migrate-password-reset.ts
 *
 * Requires DATABASE_URL in .env or .env.local
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
// @ts-expect-error — no type declarations for ws, fine for script
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env or .env.local");
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    console.log("🔄 Creating password_reset_tokens table...");

    await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    console.log("✅ password_reset_tokens table created (or already exists).");
    await pool.end();
}

main().catch(async (err) => {
    console.error("Fatal error:", err);
    await pool.end();
    process.exit(1);
});
