import ExcelJS from "exceljs";
import { monthNumberToName } from "@/lib/utils/dates";

export interface ExportExpenseRow {
    year: number;
    month: number;
    category: string;
    amount: number;
}

export interface ExportData {
    expenses: ExportExpenseRow[];
}

/**
 * Export expense data to an Excel (.xlsx) buffer.
 * Matches the original "Spending Tracker.xlsx" structure:
 *   Sheet 1 "Monthly Input": Year | Month | Category | Amount
 *   Sheet 2 "Summary": Pivot-style category × month totals
 */
export async function exportToExcel(data: ExportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kharcha";
    workbook.created = new Date();

    // Sort expenses by year, month, category
    const sorted = [...data.expenses].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.category.localeCompare(b.category);
    });

    // ─── Sheet 1: Monthly Input ─────────────────────────────────────────────
    const inputSheet = workbook.addWorksheet("Monthly Input");

    inputSheet.columns = [
        { header: "Year", key: "year", width: 10 },
        { header: "Month", key: "month", width: 12 },
        { header: "Category", key: "category", width: 20 },
        { header: "Amount", key: "amount", width: 15 },
    ];

    // Style header row
    const headerRow = inputSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF59E0B" },
    };

    for (const exp of sorted) {
        inputSheet.addRow({
            year: exp.year,
            month: exp.month,
            category: exp.category,
            amount: exp.amount,
        });
    }

    // Format amount column as number with 2 decimals
    inputSheet.getColumn("amount").numFmt = "#,##0.00";

    // ─── Sheet 2: Summary (pivot) ───────────────────────────────────────────
    const summarySheet = workbook.addWorksheet("Summary");

    // Collect unique months and categories
    const monthKeys = new Set<string>();
    const categories = new Set<string>();
    const pivotData: Record<string, Record<string, number>> = {};

    for (const exp of sorted) {
        const monthKey = `${monthNumberToName(exp.month, "short")} ${exp.year}`;
        monthKeys.add(monthKey);
        categories.add(exp.category);

        if (!pivotData[exp.category]) pivotData[exp.category] = {};
        pivotData[exp.category][monthKey] = (pivotData[exp.category][monthKey] || 0) + exp.amount;
    }

    const monthList = Array.from(monthKeys);

    // Header row: Category | Month1 | Month2 | ...
    summarySheet.columns = [
        { header: "Category", key: "category", width: 20 },
        ...monthList.map((m) => ({ header: m, key: m, width: 14 })),
    ];

    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true };
    summaryHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF59E0B" },
    };

    // Data rows
    for (const cat of Array.from(categories).sort()) {
        const row: Record<string, string | number> = { category: cat };
        for (const mk of monthList) {
            row[mk] = pivotData[cat]?.[mk] || 0;
        }
        summarySheet.addRow(row);
    }

    // Format all month columns as number
    for (let i = 2; i <= monthList.length + 1; i++) {
        summarySheet.getColumn(i).numFmt = "#,##0.00";
    }

    // Write to buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}
