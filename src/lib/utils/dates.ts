const MONTH_NAMES_FULL = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
] as const;

const MONTH_NAMES_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;

/**
 * Convert a month name to its 1-indexed number.
 * Accepts full names ("January"), short names ("Jan"), case-insensitive.
 */
export function monthNameToNumber(name: string): number | null {
    if (!name) return null;

    const lower = name.toLowerCase();

    // Try full name match
    const fullIdx = MONTH_NAMES_FULL.findIndex((m) => m.toLowerCase() === lower);
    if (fullIdx !== -1) return fullIdx + 1;

    // Try short name match
    const shortIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === lower);
    if (shortIdx !== -1) return shortIdx + 1;

    return null;
}

/**
 * Convert a 1-indexed month number to its name.
 */
export function monthNumberToName(month: number, format: "long" | "short" = "long"): string | null {
    if (!isValidMonth(month)) return null;

    return format === "short" ? MONTH_NAMES_SHORT[month - 1] : MONTH_NAMES_FULL[month - 1];
}

/**
 * Format a month/year pair as a readable label.
 * (1, 2026) → "January 2026"
 * (12, 2024, "short") → "Dec 2024"
 */
export function getMonthYearLabel(
    month: number,
    year: number,
    format: "long" | "short" = "long"
): string {
    const name = monthNumberToName(month, format);
    return `${name} ${year}`;
}

/**
 * Get the previous month/year pair.
 * (1, 2026) → { month: 12, year: 2025 }
 */
export function getPreviousMonth(month: number, year: number): { month: number; year: number } {
    if (month === 1) {
        return { month: 12, year: year - 1 };
    }
    return { month: month - 1, year };
}

/**
 * Get the next month/year pair.
 * (12, 2025) → { month: 1, year: 2026 }
 */
export function getNextMonth(month: number, year: number): { month: number; year: number } {
    if (month === 12) {
        return { month: 1, year: year + 1 };
    }
    return { month: month + 1, year };
}

/**
 * Check if a month number is valid (1-12).
 */
export function isValidMonth(month: number): boolean {
    return Number.isInteger(month) && month >= 1 && month <= 12;
}

/**
 * Check if a year is reasonable (1900-2100).
 */
export function isValidYear(year: number): boolean {
    return Number.isInteger(year) && year >= 1900 && year <= 2100;
}

/**
 * Pre-built items map for base-ui Select: "1" → "Jan", ... "12" → "Dec".
 * Pass as `items` prop to `<Select>` so `<SelectValue>` can resolve labels
 * even when dropdown items are portaled and unmounted.
 */
export const MONTH_SELECT_ITEMS: Record<string, string> = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [String(i + 1), MONTH_NAMES_SHORT[i]])
);
