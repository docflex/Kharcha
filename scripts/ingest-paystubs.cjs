/**
 * Bulk ingest BlackRock paystub PDFs into monthly_income table.
 *
 * Usage: node scripts/ingest-paystubs.cjs
 */

const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { Pool } = require("@neondatabase/serverless");
const { v4: uuid } = require("uuid");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
}
const PAYSTUB_DIR = "/Users/rmoin/Downloads/Personal/BlackRock";
const USER_ID = "d0c0a1e0-ad5e-42cb-ae70-6242d8024ba8";

const MONTH_MAP = {
    january: 1, february: 2, march: 3, april: 4,
    may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4,
    jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Extract month, year, NET PAY, and source type from a paystub PDF buffer.
 */
async function parsePaystub(buffer, filename) {
    const data = await pdf(buffer);
    const text = data.text;

    // Extract month/year from "Payslip for the Month of <Month>-<Year>"
    const monthMatch = text.match(/Payslip for the Month of\s+(\w+)-(\d{4})/i);
    if (!monthMatch) {
        return { error: `Could not find month/year in ${filename}` };
    }

    const monthName = monthMatch[1].toLowerCase();
    const year = parseInt(monthMatch[2], 10);
    const month = MONTH_MAP[monthName];
    if (!month) {
        return { error: `Unknown month "${monthMatch[1]}" in ${filename}` };
    }

    // Extract NET PAY — it's the standalone number on the line before "Bank-Transfer"
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    let netPay = null;

    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i + 1].startsWith("Bank-Transfer") || lines[i + 1].startsWith("Bank")) {
            const numMatch = lines[i].match(/^(\d+(?:,\d+)*\.\d{2})$/);
            if (numMatch) {
                netPay = parseFloat(numMatch[1].replace(/,/g, ""));
            }
        }
    }

    if (netPay === null) {
        // Fallback: find the number right after "NET PAY" section
        const netPayIdx = text.indexOf("NET PAY");
        if (netPayIdx !== -1) {
            const afterNetPay = text.substring(netPayIdx);
            // Find standalone number lines
            const nums = afterNetPay.match(/\n(\d+(?:,\d+)*\.\d{2})\n/g);
            if (nums && nums.length >= 1) {
                // The last standalone number before Bank-Transfer is NET PAY
                const bankIdx = afterNetPay.indexOf("Bank-Transfer");
                for (const n of nums) {
                    const val = n.trim();
                    const pos = afterNetPay.indexOf(n);
                    if (bankIdx === -1 || pos < bankIdx) {
                        netPay = parseFloat(val.replace(/,/g, ""));
                    }
                }
            }
        }
    }

    if (netPay === null) {
        return { error: `Could not extract NET PAY from ${filename}` };
    }

    // Determine source type from filename
    let source = "salary";
    if (filename.toLowerCase().includes("bonus")) {
        source = "bonus";
    }

    return { year, month, netPay, source, filename };
}

async function main() {
    console.log("📂 Paystub dir:", PAYSTUB_DIR);
    console.log("📂 DB:", DB_PATH);

    // Find all PDFs
    const pdfs = [];
    for (const yearDir of fs.readdirSync(PAYSTUB_DIR).sort()) {
        const yearPath = path.join(PAYSTUB_DIR, yearDir);
        if (!fs.statSync(yearPath).isDirectory()) continue;
        for (const file of fs.readdirSync(yearPath).sort()) {
            if (!file.endsWith(".pdf")) continue;
            // Skip increment letter (not a payslip)
            if (file.toLowerCase().includes("increment")) {
                console.log(`⏭️  Skipping ${file} (increment letter)`);
                continue;
            }
            pdfs.push({ path: path.join(yearPath, file), name: file });
        }
    }

    console.log(`\n📄 Found ${pdfs.length} paystub PDFs\n`);

    // Parse all PDFs
    const results = [];
    const errors = [];

    for (const p of pdfs) {
        const buf = fs.readFileSync(p.path);
        const result = await parsePaystub(buf, p.name);
        if (result.error) {
            errors.push(result.error);
            console.log(`❌ ${result.error}`);
        } else {
            results.push(result);
            const label = `${String(result.month).padStart(2, "0")}/${result.year}`;
            console.log(`✅ ${p.name} → ${label} | ₹${result.netPay.toLocaleString("en-IN")} (${result.source})`);
        }
    }

    if (errors.length > 0) {
        console.log(`\n⚠️  ${errors.length} errors`);
    }

    // Connect to DB and insert
    const pool = new Pool({ connectionString: DATABASE_URL });

    // Clear previous paystub income entries
    const deleteResult = await pool.query(
        "DELETE FROM monthly_income WHERE user_id = $1 AND (source = 'salary' OR source = 'bonus')",
        [USER_ID]
    );
    if (deleteResult.rowCount > 0) {
        console.log(`\n🗑️  Cleared ${deleteResult.rowCount} previous income entries`);
    }

    // Insert
    let inserted = 0;
    for (const r of results) {
        await pool.query(
            `INSERT INTO monthly_income (id, user_id, year, month, amount, source, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [uuid(), USER_ID, r.year, r.month, r.netPay, r.source, new Date()]
        );
        inserted++;
    }

    console.log(`\n✅ Inserted ${inserted} income entries`);

    // Summary
    const summary = await pool.query(
        `SELECT year, month, source, amount
         FROM monthly_income
         WHERE user_id = $1
         ORDER BY year, month, source`,
        [USER_ID]
    );

    console.log("\n📅 Monthly income breakdown:");
    for (const row of summary.rows) {
        const label = `${String(row.month).padStart(2, "0")}/${row.year}`;
        console.log(`   ${label} [${row.source}] ₹${Number(row.amount).toLocaleString("en-IN")}`);
    }

    await pool.end();
    console.log("\n🏁 Done!");
}

main().catch(err => {
    console.error("❌ Fatal:", err);
    process.exit(1);
});
