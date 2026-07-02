import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

neonConfig.webSocketConstructor = ws;
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
for (const l of env.split("\n")) {
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i === -1) continue;
    process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Verify password_changed_at column exists
const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed_at'");
console.log("password_changed_at column exists?", r.rows.length > 0);
// Verify audit_log table exists
const r2 = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'audit_log'");
console.log("audit_log table exists?", r2.rows.length > 0);
await pool.end();
