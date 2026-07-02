/**
 * Migration script — adds the data_version column to the users table.
 *
 * Usage:
 *   npx tsx scripts/add-data-version-column.ts
 *
 * Requires DATABASE_URL in .env or .env.local
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
// @ts-expect-error — no type declarations for ws, fine for script
import ws from "ws";
import * as fs from "fs";
import * as path from "path";

// Use ws for WebSocket in Node.js
neonConfig.webSocketConstructor = ws;

// Load .env.local
const envPath = path.resolve(import.meta.dirname ?? __dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
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
    console.error("❌ DATABASE_URL not set. Add it to .env or .env.local");
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    console.log("🚀 Adding data_version column to users table...\n");

    const client = await pool.connect();

    try {
        // Check if column already exists
        const check = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'data_version'
        `);

        if (check.rows.length > 0) {
            console.log("✅ Column data_version already exists. Nothing to do.");
            return;
        }

        // Add the column
        await client.query(`
            ALTER TABLE users
            ADD COLUMN data_version INTEGER NOT NULL DEFAULT 0
        `);

        console.log("✅ Added data_version column (INTEGER NOT NULL DEFAULT 0)");

        // Verify
        const verify = await client.query(`
            SELECT id, name, data_version FROM users
        `);
        console.log(`\n👤 Users with data_version:`);
        for (const row of verify.rows) {
            console.log(`  ${row.name ?? row.id}: version=${row.data_version}`);
        }
    } finally {
        client.release();
    }

    console.log("\n🎉 Done!");
}

main()
    .catch(async (err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
    });
