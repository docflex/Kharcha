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
 * Escape a CSV field — wrap in quotes if it contains commas, quotes, or newlines.
 */
function escapeField(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Export expense data to a CSV string.
 * Includes UTF-8 BOM for Excel compatibility.
 * Columns: Year, Month, Category, Amount (INR)
 */
export function exportToCsv(data: ExportData): string {
    // Sort by year, month, category
    const sorted = [...data.expenses].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.category.localeCompare(b.category);
    });

    const header = "Year,Month,Category,Amount (INR)";

    const rows = sorted.map((exp) => {
        const monthName = monthNumberToName(exp.month) || String(exp.month);
        return [String(exp.year), monthName, escapeField(exp.category), exp.amount.toFixed(2)].join(
            ","
        );
    });

    // UTF-8 BOM + header + data rows
    return "\uFEFF" + [header, ...rows].join("\n");
}
