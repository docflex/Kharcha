import ExcelJS from "exceljs";
import { expenses } from "@/lib/db/schema";
import { monthNameToNumber } from "@/lib/utils/dates";
import { v4 as uuid } from "uuid";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

export interface ParsedExcelRow {
    year: number;
    month: number;
    category: string;
    amount: number;
    rawMonth: string;
}

export interface ParseResult {
    rows: ParsedExcelRow[];
    errors: string[];
    categories: string[];
    summary: {
        totalRows: number;
        totalAmount: number;
        dateRange: {
            startYear: number;
            startMonth: number;
            endYear: number;
            endMonth: number;
        };
    };
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}

/**
 * Parse a Spending Tracker .xlsx buffer.
 *
 * Expected format:
 * - Sheet named "Monthly Input"
 * - Columns D-G (4-7): Year | Month | Category | Amount
 * - Data starts at row 3
 */
export async function parseExcelBuffer(buffer: Buffer | ArrayBuffer): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const sheet = workbook.getWorksheet("Monthly Input");
    if (!sheet) {
        return {
            rows: [],
            errors: ["Sheet 'Monthly Input' not found"],
            categories: [],
            summary: {
                totalRows: 0,
                totalAmount: 0,
                dateRange: { startYear: 0, startMonth: 0, endYear: 0, endMonth: 0 },
            },
        };
    }

    const rows: ParsedExcelRow[] = [];
    const errors: string[] = [];
    const categorySet = new Set<string>();

    sheet.eachRow((row, rowNumber) => {
        // Skip header rows (data starts at row 3)
        if (rowNumber < 3) return;

        const yearVal = row.getCell(4).value; // Column D
        const monthVal = row.getCell(5).value; // Column E
        const categoryVal = row.getCell(6).value; // Column F
        const amountVal = row.getCell(7).value; // Column G

        // Skip completely empty rows
        if (!yearVal && !monthVal && !categoryVal && !amountVal) return;

        // Validate year
        const year = typeof yearVal === "number" ? yearVal : Number(yearVal);
        if (!year || year < 2000 || year > 2100) {
            errors.push(`Row ${rowNumber}: invalid year "${yearVal}"`);
            return;
        }

        // Validate month
        const monthStr = String(monthVal || "").trim();
        const month = monthNameToNumber(monthStr);
        if (month === null) {
            errors.push(`Row ${rowNumber}: invalid month "${monthStr}"`);
            return;
        }

        // Validate category
        const category = String(categoryVal || "").trim();
        if (!category) {
            errors.push(`Row ${rowNumber}: missing category`);
            return;
        }

        // Validate amount
        const amount = typeof amountVal === "number" ? amountVal : Number(amountVal);
        if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowNumber}: invalid amount "${amountVal}"`);
            return;
        }

        categorySet.add(category);
        rows.push({ year, month, category, amount, rawMonth: monthStr });
    });

    // Compute summary
    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    let startYear = 0,
        startMonth = 0,
        endYear = 0,
        endMonth = 0;

    if (rows.length > 0) {
        startYear = Math.min(...rows.map((r) => r.year));
        endYear = Math.max(...rows.map((r) => r.year));
        const startRows = rows.filter((r) => r.year === startYear);
        const endRows = rows.filter((r) => r.year === endYear);
        startMonth = Math.min(...startRows.map((r) => r.month));
        endMonth = Math.max(...endRows.map((r) => r.month));
    }

    return {
        rows,
        errors,
        categories: Array.from(categorySet).sort(),
        summary: {
            totalRows: rows.length,
            totalAmount,
            dateRange: { startYear, startMonth, endYear, endMonth },
        },
    };
}

/**
 * Import parsed Excel rows into the database as expenses.
 *
 * @param categoryMap - Maps category name → category ID for this user
 */
export async function importExcelData(
    db: Db,
    userId: string,
    rows: ParsedExcelRow[],
    categoryMap: Record<string, string>
): Promise<ImportResult> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
        const categoryId = categoryMap[row.category];
        if (!categoryId) {
            skipped++;
            errors.push(
                `Skipped: category "${row.category}" not mapped (${row.rawMonth} ${row.year})`
            );
            continue;
        }

        await db.insert(expenses).values({
            id: uuid(),
            userId,
            categoryId,
            year: row.year,
            month: row.month,
            amount: row.amount,
            source: "import",
            confidence: 1.0,
            notes: `Imported from Excel`,
            createdAt: new Date(),
        });

        imported++;
    }

    return { imported, skipped, errors };
}
