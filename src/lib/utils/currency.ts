/**
 * Parse an Indian-formatted number string to a float.
 *
 * Handles: ₹2,00,077.00 | 15,000.00 | 835.80 | 72.00 | ₹ 9,824.80
 * Also handles international format: 200,077.00
 */
export function parseIndianNumber(str: string): number {
    if (!str || typeof str !== "string") return NaN;

    // Remove ₹ symbol and whitespace
    const cleaned = str.replace(/[₹\s]/g, "");

    if (cleaned.length === 0) return NaN;

    // Remove all commas (Indian or international — doesn't matter)
    const noCommas = cleaned.replace(/,/g, "");

    const result = parseFloat(noCommas);
    return isNaN(result) ? NaN : result;
}

/**
 * Format a number as INR with Indian comma grouping.
 *
 * Indian grouping: XX,XX,XXX.XX (groups of 2 after the initial 3 from the right)
 * Examples: 200077 → ₹2,00,077.00 | 15000 → ₹15,000.00
 */
export function formatINR(amount: number): string {
    return formatCurrency(amount, "INR");
}

/**
 * Format a number in any currency using Intl.NumberFormat.
 *
 * For INR, uses the Indian numbering system (en-IN) for proper comma grouping.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a raw numeric string with locale-aware comma grouping for live input.
 *
 * - Strips all non-digit and non-decimal characters
 * - Adds commas based on currency locale (Indian grouping for INR, standard for others)
 * - Preserves trailing decimal and decimal digits as-is for editing UX
 *
 * Examples (INR): "1300000" → "13,00,000", "50000.5" → "50,000.5"
 * Examples (USD): "1300000" → "1,300,000", "50000.5" → "50,000.5"
 */
export function formatInputWithCommas(raw: string, currencyCode: string = "INR"): string {
    // Strip everything except digits and decimal point
    const stripped = raw.replace(/[^\d.]/g, "");
    if (!stripped) return "";

    // Split on decimal — only allow one decimal point
    const parts = stripped.split(".");
    const intPart = parts[0];
    const decPart = parts.length > 1 ? parts.slice(1).join("") : null;

    if (!intPart && decPart === null) return "";

    // Format the integer part with commas
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";
    const num = parseInt(intPart || "0", 10);
    const formatted = isNaN(num) ? "0" : new Intl.NumberFormat(locale).format(num);

    // Re-attach decimal portion as-is (preserve user's trailing digits / trailing dot)
    if (decPart !== null) {
        return `${formatted}.${decPart}`;
    }
    return formatted;
}

/**
 * Strip commas from a formatted input string for parsing.
 */
export function stripCommas(formatted: string): string {
    return formatted.replace(/,/g, "");
}
