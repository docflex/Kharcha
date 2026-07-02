/**
 * Security Hardening Migration — Phase 7.6
 * Adds: password_changed_at column + audit_log table
 *
 * Usage: npx tsx scripts/migrate-security.mjs
 *
 * Uses Pool + ws (WebSocket) — same pattern as ingest-data.ts
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool, neonConfig } from "@neondatabase/serverless";
// @ts-ignore — no type declarations for ws
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    val = val.replace(/^['"]|['"]$/g, "");
    process.env[key] = val;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

console.log("Running security migration...\n");

try {
    // 1. Add password_changed_at column to users (if not exists)
    console.log("1. Adding password_changed_at column to users...");
    await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP`
    );
    console.log("   ✓ Done\n");

    // 2. Create audit_log table
    console.log("2. Creating audit_log table...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);
    console.log("   ✓ Done\n");

    console.log("✅ Security migration complete!");
} catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
} finally {
    await pool.end();
}
