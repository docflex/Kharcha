/**
 * Bulk ingestion script — imports expenses from Excel + income from PDF paystubs.
 *
 * Usage:
 *   npx tsx scripts/ingest-data.ts
 *
 * Requires DATABASE_URL in .env or .env.local
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
// @ts-expect-error — no type declarations for ws, fine for script
import ws from "ws";
import * as schema from "../src/lib/db/schema";

// Use ws for WebSocket in Node.js
neonConfig.webSocketConstructor = ws;

const { users, categories, expenses, monthlyIncome } = schema;

// ─── Config ──────────────────────────────────────────────────────────────────

const EXCEL_PATH = "/Users/rmoin/Downloads/Personal/Spending Tracker.xlsx";
const PAYSTUB_DIR = "/Users/rmoin/Downloads/Personal/BlackRock";

const MONTH_MAP: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, may_s: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Map Excel categories → type (expense vs investment)
const INVESTMENT_CATEGORIES = new Set(["Investments"]);

// ─── DB Setup ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env or .env.local");
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthNameToNum(name: string): number | null {
    return MONTH_MAP[name.toLowerCase().trim()] ?? null;
}

async function getUser(): Promise<{ id: string; name: string | null }> {
    const rows = await db.select().from(users).limit(1);
    if (rows.length === 0) {
        console.error("❌ No users in database. Sign up first.");
        process.exit(1);
    }
    return rows[0];
}

async function ensureCategory(
    userId: string,
    name: string,
    type: "expense" | "investment",
    categoryCache: Map<string, string>
): Promise<string> {
    const key = `${name}::${type}`;
    if (categoryCache.has(key)) return categoryCache.get(key)!;

    // Check DB
    const [existing] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.name, name)));

    if (existing) {
        categoryCache.set(key, existing.id);
        return existing.id;
    }

    // Create
    const id = uuid();
    await db.insert(categories).values({
        id,
        userId,
        name,
        type,
        icon: "📦",
        color: "#f59e0b",
        sortOrder: 999,
        createdAt: new Date(),
    });
    console.log(`  📁 Created category: ${name} (${type})`);
    categoryCache.set(key, id);
    return id;
}

// ─── 1. Import Expenses from Excel ──────────────────────────────────────────

async function importExpenses(userId: string) {
    console.log("\n📊 Importing expenses from Excel...");

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_PATH);
    const ws = wb.getWorksheet("Monthly Input");
    if (!ws) {
        console.error("❌ Sheet 'Monthly Input' not found");
        return;
    }

    const categoryCache = new Map<string, string>();
    let imported = 0;
    let skipped = 0;

    for (let r = 4; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const yearVal = row.getCell(4).value;
        const monthVal = row.getCell(5).value;
        const catVal = row.getCell(6).value;
        const amtVal = row.getCell(7).value;

        if (!yearVal || !monthVal || !catVal || !amtVal) continue;

        const year = typeof yearVal === "number" ? yearVal : parseInt(String(yearVal));
        const monthStr = String(monthVal).trim();
        const month = monthNameToNum(monthStr);
        const category = String(catVal).trim();
        const amount = typeof amtVal === "number" ? amtVal : parseFloat(String(amtVal));

        // Skip header rows or invalid data
        if (!month || isNaN(year) || isNaN(amount) || category === "Category") {
            skipped++;
            continue;
        }

        const type = INVESTMENT_CATEGORIES.has(category) ? "investment" : "expense";
        const categoryId = await ensureCategory(userId, category, type as "expense" | "investment", categoryCache);

        await db.insert(expenses).values({
            id: uuid(),
            userId,
            categoryId,
            year,
            month,
            amount: Math.round(amount * 100) / 100,
            source: "import",
            confidence: 1.0,
            notes: `Imported from Spending Tracker.xlsx`,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        imported++;
    }

    console.log(`  ✅ Imported ${imported} expenses (${skipped} rows skipped)`);
}

// ─── 2. Import Income from PDF Paystubs ─────────────────────────────────────

async function importPaystubs(userId: string) {
    console.log("\n💰 Importing income from PDF paystubs...");

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");

    const years = fs.readdirSync(PAYSTUB_DIR).filter((d) => /^\d{4}$/.test(d));
    let imported = 0;
    let failed = 0;

    for (const yearDir of years.sort()) {
        const dirPath = path.join(PAYSTUB_DIR, yearDir);
        const pdfs = fs.readdirSync(dirPath).filter((f) => f.endsWith(".pdf"));

        for (const pdf of pdfs.sort()) {
            const filePath = path.join(dirPath, pdf);
            const buffer = fs.readFileSync(filePath);

            try {
                const data = await pdfParse(buffer);
                const text: string = data.text;

                // Try to extract month/year from "Payslip for the Month of <Month>-<Year>"
                const monthMatch = text.match(/Payslip for the Month of\s+(\w+)-(\d{4})/i);
                if (!monthMatch) {
                    // May be a bonus or increment letter — try filename
                    console.log(`  ⚠️  Skipping (no month/year pattern): ${pdf}`);
                    failed++;
                    continue;
                }

                const monthName = monthMatch[1].toLowerCase();
                const year = parseInt(monthMatch[2], 10);
                const month = MONTH_MAP[monthName];
                if (!month) {
                    console.log(`  ⚠️  Unknown month "${monthMatch[1]}": ${pdf}`);
                    failed++;
                    continue;
                }

                // Extract NET PAY — number on the line before "Bank-Transfer"
                const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
                let netPay: number | null = null;

                for (let i = 0; i < lines.length - 1; i++) {
                    if (lines[i + 1].startsWith("Bank-Transfer") || lines[i + 1].startsWith("Bank")) {
                        const numMatch = lines[i].match(/^(\d+(?:,\d+)*\.\d{2})$/);
                        if (numMatch) {
                            netPay = parseFloat(numMatch[1].replace(/,/g, ""));
                        }
                    }
                }

                // Fallback
                if (netPay === null) {
                    const netPayIdx = text.indexOf("NET PAY");
                    const bankIdx = text.indexOf("Bank-Transfer");
                    if (netPayIdx !== -1 && bankIdx !== -1) {
                        const between = text.substring(netPayIdx, bankIdx);
                        const nums = between.match(/\n(\d+(?:,\d+)*\.\d{2})\n/g);
                        if (nums) {
                            const last = nums[nums.length - 1].trim();
                            netPay = parseFloat(last.replace(/,/g, ""));
                        }
                    }
                }

                if (netPay === null || isNaN(netPay)) {
                    console.log(`  ⚠️  Could not extract NET PAY: ${pdf}`);
                    failed++;
                    continue;
                }

                // Determine source from filename
                const source = pdf.toLowerCase().includes("bonus") ? "bonus" : "salary";

                // Upsert
                const [existing] = await db
                    .select()
                    .from(monthlyIncome)
                    .where(
                        and(
                            eq(monthlyIncome.userId, userId),
                            eq(monthlyIncome.year, year),
                            eq(monthlyIncome.month, month),
                            eq(monthlyIncome.source, source)
                        )
                    );

                if (existing) {
                    await db
                        .update(monthlyIncome)
                        .set({ amount: netPay })
                        .where(eq(monthlyIncome.id, existing.id));
                } else {
                    await db.insert(monthlyIncome).values({
                        id: uuid(),
                        userId,
                        year,
                        month,
                        amount: netPay,
                        source,
                        createdAt: new Date(),
                    });
                }

                console.log(`  ✅ ${pdf} → ${source} ${year}-${String(month).padStart(2, "0")}: ₹${netPay.toLocaleString("en-IN")}`);
                imported++;
            } catch (err) {
                console.log(`  ❌ ${pdf}: ${err instanceof Error ? err.message : err}`);
                failed++;
            }
        }
    }

    console.log(`  ✅ Imported ${imported} income entries (${failed} skipped/failed)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🚀 Kharcha Data Ingestion");
    console.log("========================\n");

    const user = await getUser();
    console.log(`👤 User: ${user.name ?? user.id}`);

    await importExpenses(user.id);
    await importPaystubs(user.id);

    console.log("\n🎉 Done!");
    await pool.end();
}

main().catch(async (err) => {
    console.error("Fatal error:", err);
    await pool.end();
    process.exit(1);
});
