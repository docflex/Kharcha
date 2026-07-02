import { parseIndianNumber } from "../utils/currency";
import type { ExtractedEntry } from "./types";

// ─── Noise Patterns ─────────────────────────────────────────────────────────

const NOISE_PATTERNS: RegExp[] = [
    /^[\d:]+\s*(AM|PM)?$/i,
    /^\d+\s*TRANSACTIONS?$/i,
    /^(INCOME|EXPENSES|LEFT)$/i,
    /^(HEAD\s*)?CATEGORIES$/i,
    /^(OVERVIEW|SPENDING|LIST)$/i,
    /^(Overview|Budget|Wallets|Save|Tools)$/i,
    /^Budget\s+together$/i,
    /^Invite\s+budget\s+member$/i,
    /^Invite\s+your\s+partner/i,
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i,
    /^Overview:\s+\w+$/i,
    /^EXPENSES\s*[▼▲]?$/i,
    /^\d+$/,
    /^you'd\s+like/i,
];

// ─── Extraction Regex Patterns ──────────────────────────────────────────────

// Pattern A: Category name + ₹ symbol (or common OCR substitutes %, $, R) + amount
// ^[^A-Za-z]* skips any leading junk (digits from misread emoji icons, symbols, whitespace)
const PATTERN_A = /^[^A-Za-z]*([A-Za-z][A-Za-z\s]{1,25}?)\s+[₹R%$?]\s*([\d,]+(?:\.\d{0,2})?)\s*$/;

// Pattern B: Without ₹ symbol (OCR might miss it), requires ≥4 digits or comma-separated
const PATTERN_B =
    /^[^A-Za-z]*([A-Za-z][A-Za-z\s]{1,25}?)\s{2,}([\d]{1,3}(?:,\d{2,3})*(?:\.\d{0,2})?)\s*$/;

// Pattern C: Handles OCR artifacts (extra spaces, special chars between)
const PATTERN_C = /([A-Za-z][A-Za-z\s]{1,25}?)\s{2,}[₹R%$?]?\s*([\d,]+\.?\d*)/;

// Pattern D: OCR fallback — ₹ misread as digit 2, 3, or 7 glued to the amount.
// Only strips these specific digits as they are the common OCR substitutes for ₹.
// Other digits (0, 1, 4-6, 8, 9) are kept as part of the amount (handled by Pattern E).
const PATTERN_D = /^[^A-Za-z]*([A-Za-z][A-Za-z\s]{1,25}?)\s+[237]([1-9][\d,]*(?:\.\d{0,2})?)\s*$/;

// Pattern E: ₹ completely dropped — bare comma-formatted number after category.
// Requires at least one comma in the amount to avoid false positives ("Category 5").
// MUST be tried AFTER Pattern D to avoid misinterpreting misread ₹ digits.
const PATTERN_E =
    /^[^A-Za-z]*([A-Za-z][A-Za-z\s]{1,25}?)\s+([\d]{1,3}(?:,\d{2,3})+(?:\.\d{0,2})?)\s*$/;

// Pattern F: ₹ and commas both dropped — bare decimal number (e.g. "Rani 1625.05").
// Requires .XX decimals to avoid matching plain integers like "Category 5".
// Lowest confidence since no formatting cues at all.
const PATTERN_F = /^[^A-Za-z]*([A-Za-z][A-Za-z\s]{1,25}?)\s+(\d{3,7}\.\d{2})\s*$/;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse raw OCR text into category-amount pairs using line-based regex.
 *
 * Filters out noise lines, Budget Together entries, and lines with
 * numbers in category names.
 */
export function parseOcrText(text: string, sourceImage: string): ExtractedEntry[] {
    if (!text || !text.trim()) return [];

    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const results: ExtractedEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip noise
        if (isNoiseLine(line)) continue;

        // Skip Budget Together entries (colon-separated)
        if (isBudgetTogetherEntry(line)) continue;

        // Try extraction patterns
        const entry = tryExtractEntry(line, sourceImage, i);
        if (entry) {
            results.push(entry);
        }

        // Chart header fallback: standalone amount on one line, category label on next
        // e.g. "® 118,000.00\n wt INVESTMENTS"
        if (!entry && i + 1 < lines.length) {
            const amountMatch = line.match(/[₹R%$?]?\s*([\d]{1,3}(?:,\d{2,3})+(?:\.\d{0,2})?)\s*$/);
            const nextLine = lines[i + 1]
                .replace(/^[^A-Za-z]+/, "")
                .replace(/^[A-Za-z]{1,3}\s+(?=[A-Za-z]{3,})/, "")
                .trim();
            if (amountMatch && /^[A-Z]{3,}$/i.test(nextLine)) {
                // Strip misread ₹ digit (2, 3, or 7) from chart amounts too
                let headerAmount = amountMatch[1];
                if (/^[237][1-9]/.test(headerAmount)) {
                    headerAmount = headerAmount.slice(1);
                }
                const headerEntry = buildEntry(nextLine, headerAmount, 0.75, sourceImage, i);
                if (headerEntry) {
                    results.push(headerEntry);
                    i++; // skip the label line
                }
            }
        }
    }

    return results;
}

/**
 * Check if a line is noise (status bar, tabs, nav, etc.).
 */
export function isNoiseLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return true;

    for (const pattern of NOISE_PATTERNS) {
        if (pattern.test(trimmed)) return true;
    }

    return false;
}

/**
 * Check if a line is a Budget Together entry (colon-separated: "Category: ₹Amount").
 */
export function isBudgetTogetherEntry(line: string): boolean {
    // Colon-separated "Category: ₹Amount" — must have 3+ letter word before colon,
    // colon (not semicolon — OCR semicolons cause false positives), and a digit after.
    // Also reject if line has 2+ spaces before a number (that's a list entry, not budget-together).
    if (/[A-Za-z]{2,}\s{2,}[₹R%$]?\d/.test(line)) return false;
    return /[A-Za-z]{3,}:\s*[₹R%$]?\d/.test(line);
}

/**
 * Extract the numeric amount from a line containing a ₹ or number pattern.
 */
export function extractAmountFromLine(line: string): number {
    // Try to find amount with ₹ symbol or common OCR substitutes first
    const withSymbol = line.match(/[₹R%$]\s*([\d,]+(?:\.\d{0,2})?)/);
    if (withSymbol) {
        return parseIndianNumber(withSymbol[1]);
    }

    // Try to find a standalone number (must have comma or decimal to be an amount)
    const standalone = line.match(/([\d]{1,3}(?:,\d{2,3})+(?:\.\d{0,2})?)/);
    if (standalone) {
        return parseIndianNumber(standalone[1]);
    }

    // Try a plain decimal number
    const decimal = line.match(/([\d]+\.\d{1,2})/);
    if (decimal) {
        return parseIndianNumber(decimal[1]);
    }

    return NaN;
}

// ─── Internals ──────────────────────────────────────────────────────────────

/**
 * Strip OCR'd icon junk from the start of a line.
 * Icons are typically read as short letter sequences mixed with symbols:
 *   "(v) Laundry" → "Laundry"
 *   "m= Taxi" → "Taxi"
 *   "& Rani" → "Rani"
 *   "oe Rapido" → "Rapido"  (handled by ^[^A-Za-z]* already)
 */
function stripIconPrefix(line: string): string {
    // Pattern: optional non-alpha junk, then 1-2 letter(s) followed by non-alpha,
    // then more non-alpha, before a 3+ letter word (the real category)
    return line.replace(/^[^A-Za-z]*(?:[A-Za-z]{1,2}[^A-Za-z]+)*(?=[A-Za-z]{3,})/, "");
}

function tryExtractEntry(
    line: string,
    sourceImage: string,
    lineIndex: number
): ExtractedEntry | null {
    // Try the original line first, then a cleaned version with icon junk stripped
    const variants = [line];
    const cleaned = stripIconPrefix(line);
    if (cleaned !== line && cleaned.length > 3) {
        variants.push(cleaned);
    }

    for (const variant of variants) {
        const result = tryExtractFromLine(variant, sourceImage, lineIndex);
        if (result) return result;
    }
    return null;
}

function tryExtractFromLine(
    line: string,
    sourceImage: string,
    lineIndex: number
): ExtractedEntry | null {
    // Try patterns in order of specificity
    let match: RegExpMatchArray | null;
    let confidence = 0.5;

    // Pattern A: with ₹ symbol (highest confidence)
    match = line.match(PATTERN_A);
    if (match) {
        confidence = 0.92;
        return buildEntry(match[1], match[2], confidence, sourceImage, lineIndex);
    }

    // Pattern B: space-separated (medium confidence)
    match = line.match(PATTERN_B);
    if (match) {
        confidence = 0.75;
        return buildEntry(match[1], match[2], confidence, sourceImage, lineIndex);
    }

    // Pattern C: loose extraction (lower confidence)
    match = line.match(PATTERN_C);
    if (match) {
        confidence = 0.65;
        return buildEntry(match[1], match[2], confidence, sourceImage, lineIndex);
    }

    // Pattern D: OCR fallback — ₹ misread as digit
    match = line.match(PATTERN_D);
    if (match) {
        confidence = 0.6;
        return buildEntry(match[1], match[2], confidence, sourceImage, lineIndex);
    }

    // Pattern E: ₹ completely dropped — bare comma-formatted amount (e.g. "i Food 9,824.80")
    match = line.match(PATTERN_E);
    if (match) {
        confidence = 0.7;
        return buildEntry(match[1], match[2], confidence, sourceImage, lineIndex);
    }

    // Pattern F: ₹ and commas both dropped — bare decimal (e.g. "Rani 1625.05")
    match = line.match(PATTERN_F);
    if (match) {
        confidence = 0.55;
        return buildEntry(match[1], match[2], confidence, sourceImage, lineIndex);
    }

    return null;
}

function buildEntry(
    rawCategory: string,
    rawAmount: string,
    baseConfidence: number,
    sourceImage: string,
    lineIndex: number
): ExtractedEntry | null {
    const category = rawCategory.trim();
    const amount = parseIndianNumber(rawAmount);

    // Reject if category contains digits
    if (/\d/.test(category)) return null;

    // Reject if category is too short
    if (category.length < 2) return null;

    // Reject if amount is invalid
    if (isNaN(amount) || amount <= 0) return null;

    // Reject if the category matches noise
    if (isNoiseLine(category)) return null;

    let confidence = baseConfidence;

    // Boost: amount has exact 2 decimal places (e.g. 1,969.42)
    if (/\.\d{2}$/.test(rawAmount)) {
        confidence += 0.04;
    }

    // Boost: amount has Indian comma grouping (e.g. 2,00,077.00)
    if (/\d{1,2},\d{2},/.test(rawAmount) || /\d{1,3},\d{3}/.test(rawAmount)) {
        confidence += 0.03;
    }

    // Boost: category name is ≥4 chars (more likely to be a real word)
    if (category.length >= 4) {
        confidence += 0.02;
    }

    // Penalty: category name is very short (2 chars) — likely truncated OCR
    if (category.length <= 2) {
        confidence -= 0.25;
    }

    return {
        category,
        amount,
        confidence: Math.min(confidence, 1.0),
        sourceImage,
        lineIndex,
    };
}
