/**
 * One-time ingestion script: Reads "Spending Tracker.xlsx" and imports
 * all data from Jan 2024 to Jun 2026 into the kharcha database.
 *
 * Usage: npx tsx scripts/ingest-excel.ts
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, and, sum, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import * as schema from "@/lib/db/schema";
import { parseExcelBuffer, importExcelData } from "@/lib/import/excel";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
}
const EXCEL_PATH = path.resolve(process.cwd(), "..", "Spending Tracker.xlsx");

async function main() {
    // ─── 1. Connect to DB ────────────────────────────────────────────────────
    console.log(`📂 DB: ${DATABASE_URL!.replace(/:[^:@]+@/, ":***@")}`);
    console.log(`📊 Excel: ${EXCEL_PATH}`);

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ Excel file not found:", EXCEL_PATH);
        process.exit(1);
    }

    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle(pool, { schema });

    // ─── 2. Find user ────────────────────────────────────────────────────────
    const users = await db.select().from(schema.users);
    if (users.length === 0) {
        console.error("❌ No users found in DB. Register first.");
        process.exit(1);
    }
    const user = users[0];
    console.log(`👤 User: ${user.name} (${user.id})`);

    // ─── 3. Parse Excel ──────────────────────────────────────────────────────
    const buffer = fs.readFileSync(EXCEL_PATH);
    const parseResult = await parseExcelBuffer(buffer);

    console.log(`\n📋 Parse result:`);
    console.log(`   Rows: ${parseResult.summary.totalRows}`);
    console.log(
        `   Amount: ₹${parseResult.summary.totalAmount.toLocaleString("en-IN")}`
    );
    console.log(
        `   Range: ${parseResult.summary.dateRange.startMonth}/${parseResult.summary.dateRange.startYear} → ${parseResult.summary.dateRange.endMonth}/${parseResult.summary.dateRange.endYear}`
    );
    console.log(`   Categories found: ${parseResult.categories.join(", ")}`);

    if (parseResult.errors.length > 0) {
        console.log(`\n⚠️  Parse errors (${parseResult.errors.length}):`);
        for (const err of parseResult.errors.slice(0, 20)) {
            console.log(`   - ${err}`);
        }
        if (parseResult.errors.length > 20) {
            console.log(`   ... and ${parseResult.errors.length - 20} more`);
        }
    }

    if (parseResult.rows.length === 0) {
        console.error("❌ No rows parsed. Check the Excel format.");
        process.exit(1);
    }

    // ─── 4. Build category map ───────────────────────────────────────────────
    const existingCategories = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.userId, user.id));

    const categoryMap: Record<string, string> = {};
    const nameLookup = new Map<string, string>();

    for (const cat of existingCategories) {
        nameLookup.set(cat.name.toLowerCase(), cat.id);
    }

    // Map each Excel category to an existing or new DB category
    for (const catName of parseResult.categories) {
        const existing = nameLookup.get(catName.toLowerCase());
        if (existing) {
            categoryMap[catName] = existing;
        } else {
            // Auto-create missing category
            const newId = uuid();
            const type = catName.toLowerCase().includes("invest") ? "investment" : "expense";
            await db.insert(schema.categories).values({
                id: newId,
                userId: user.id,
                name: catName,
                type,
                createdAt: new Date(),
            });
            categoryMap[catName] = newId;
            console.log(`   ✨ Created category: ${catName} (${type})`);
        }
    }

    console.log(`\n🗂️  Category mapping (${Object.keys(categoryMap).length}):`);
    for (const [name, id] of Object.entries(categoryMap)) {
        console.log(`   ${name} → ${id.slice(0, 8)}...`);
    }

    // ─── 5. Clear any previous imports ───────────────────────────────────────
    const existingImports = await db
        .select({ id: schema.expenses.id })
        .from(schema.expenses)
        .where(eq(schema.expenses.source, "import"));

    if (existingImports.length > 0) {
        console.log(`\n🗑️  Clearing ${existingImports.length} previous import records...`);
        for (const row of existingImports) {
            await db
                .delete(schema.expenses)
                .where(eq(schema.expenses.id, row.id));
        }
    }

    // ─── 6. Import ───────────────────────────────────────────────────────────
    console.log(`\n⬇️  Importing ${parseResult.rows.length} expense rows...`);
    const result = await importExcelData(db, user.id, parseResult.rows, categoryMap);

    console.log(`\n✅ Import complete:`);
    console.log(`   Imported: ${result.imported}`);
    console.log(`   Skipped: ${result.skipped}`);
    if (result.errors.length > 0) {
        console.log(`   Errors:`);
        for (const err of result.errors) {
            console.log(`     - ${err}`);
        }
    }

    // ─── 7. Verify ───────────────────────────────────────────────────────────
    const total = await db
        .select({ id: schema.expenses.id })
        .from(schema.expenses)
        .where(eq(schema.expenses.userId, user.id));

    console.log(`\n📊 Total expenses in DB: ${total.length}`);

    // Per-month breakdown
    const monthBreakdown = await db
        .select({
            year: schema.expenses.year,
            month: schema.expenses.month,
            cnt: sql<number>`count(*)`,
            total: sql<number>`round(cast(sum(${schema.expenses.amount}) as numeric), 2)`,
        })
        .from(schema.expenses)
        .where(eq(schema.expenses.userId, user.id))
        .groupBy(schema.expenses.year, schema.expenses.month)
        .orderBy(schema.expenses.year, schema.expenses.month);

    console.log(`\n📅 Monthly breakdown:`);
    for (const m of monthBreakdown) {
        console.log(
            `   ${String(m.month).padStart(2, "0")}/${m.year}: ${m.cnt} entries, ₹${Number(m.total).toLocaleString("en-IN")}`
        );
    }

    await pool.end();
    console.log("\n🏁 Done!");
}

main().catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
});
