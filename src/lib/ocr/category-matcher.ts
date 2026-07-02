/**
 * Category Matcher — alias resolution + fuzzy matching.
 *
 * Normalizes OCR-extracted category names to canonical forms.
 * Uses a static alias map + Levenshtein distance for fuzzy matching.
 */

// ─── Known Aliases ──────────────────────────────────────────────────────────

export const CATEGORY_ALIASES: Record<string, string> = {
    service: "Services",
    services: "Services",
    "home supply": "Home Supplies",
    "home supplies": "Home Supplies",
    "home supplles": "Home Supplies", // common OCR typo
    misc: "Miscellaneous",
    miscellaneous: "Miscellaneous",
    taxi: "Taxi",
    cab: "Taxi",
    uber: "Taxi",
    ola: "Taxi",
    phone: "Telephone",
    tel: "Telephone",
    telephone: "Telephone",
    movie: "Cinema",
    movies: "Cinema",
    cinema: "Cinema",
    gym: "Gym",
    fitness: "Gym",
    doctor: "Doctor",
    medical: "Doctor",
    hospital: "Doctor",
    gift: "Gift",
    gifts: "Gift",
    bank: "Bank",
    banking: "Bank",
    laundry: "Laundry",
    "dry clean": "Laundry",
    hotel: "Hotel",
    hotels: "Hotel",
    stay: "Hotel",
    flight: "Flight",
    flights: "Flight",
    airfare: "Flight",
    electricity: "Electricity",
    electric: "Electricity",
    power: "Electricity",
    rent: "Rent",
    "house rent": "Rent",
    food: "Food",
    dining: "Food",
    restaurant: "Food",
    groceries: "Groceries",
    grocery: "Groceries",
    shopping: "Shopping",
    electronics: "Electronics",
    entertainment: "Entertainment",
    rapido: "Rapido",
    investments: "Investments",
    investment: "Investments",
    sip: "Investments",
    "mutual fund": "Investments",
    // OCR truncation aliases (short/garbled reads)
    rt: "Rent",
    ren: "Rent",
    fo: "Food",
    groc: "Groceries",
    elec: "Electricity",
    ent: "Entertainment",
    rap: "Rapido",
    inv: "Investments",
    doc: "Doctor",
    cin: "Cinema",
    shop: "Shopping",
    sho: "Shopping",
    fli: "Flight",
    hot: "Hotel",
    hom: "Home Supplies",
    clothe: "Clothes",
    clothes: "Clothes",
    clothing: "Clothes",
    insurance: "Insurance",
    insur: "Insurance",
    // Common OCR garbles
    rani: "Bank", // OCR misreads "Bank" icon+text
    bani: "Bank",
    ban: "Bank",
    lau: "Laundry",
    laun: "Laundry",
    laundr: "Laundry",
    tele: "Telephone",
    // OCR truncations for Rent
    rn: "Rent",
    re: "Rent",
    // OCR garbles for Services
    sie: "Services",
    serv: "Services",
    servic: "Services",
    // OCR garbles for Rapido
    ronido: "Rapido",
    ropido: "Rapido",
    ropico: "Rapido",
    rapld: "Rapido",
};

// ─── Category Normalization ─────────────────────────────────────────────────

/**
 * Normalize an OCR-extracted category name:
 *   1. Trim whitespace
 *   2. Strip leading non-alpha chars (emoji, bullet, etc.)
 *   3. Collapse internal whitespace
 *   4. Look up alias map
 *   5. Title case
 */
export function normalizeCategory(name: string): string {
    if (!name || !name.trim()) return "";

    // Strip leading non-alpha characters
    let cleaned = name.replace(/^[^A-Za-z]+/, "");

    // Strip leading 1-3 letter "words" that are likely OCR'd icon characters
    // e.g., "Oo Rapido" → "Rapido", "mn Food" → "Food", "Lol Cinema" → "Cinema"
    // Case-insensitive lookahead so "mn food" also strips
    cleaned = cleaned.replace(/^[A-Za-z]{1,3}\s+(?=[A-Za-z]{3,})/, "");

    // Trim + collapse internal whitespace
    cleaned = cleaned.trim().replace(/\s+/g, " ");

    if (!cleaned) return "";

    // Look up alias (case-insensitive)
    const lower = cleaned.toLowerCase();
    if (CATEGORY_ALIASES[lower]) {
        return CATEGORY_ALIASES[lower];
    }

    // Title case
    return cleaned
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

// ─── Category Matching ──────────────────────────────────────────────────────

export interface MatchResult {
    category: string;
    confidence: number;
    isExact: boolean;
}

/**
 * Match an OCR-extracted category name against a list of known categories.
 * Uses alias resolution first, then case-insensitive exact match, then fuzzy.
 */
export function matchCategory(ocrCategory: string, knownCategories: string[]): MatchResult {
    const normalized = normalizeCategory(ocrCategory);

    if (!normalized) {
        return { category: ocrCategory, confidence: 0, isExact: false };
    }

    // 1. Exact match (case-insensitive)
    const exactMatch = knownCategories.find((c) => c.toLowerCase() === normalized.toLowerCase());
    if (exactMatch) {
        return { category: exactMatch, confidence: 1.0, isExact: true };
    }

    // 2. Alias resolved + exact match
    const lower = normalized.toLowerCase();
    if (CATEGORY_ALIASES[lower]) {
        const aliasTarget = CATEGORY_ALIASES[lower];
        const aliasMatch = knownCategories.find(
            (c) => c.toLowerCase() === aliasTarget.toLowerCase()
        );
        if (aliasMatch) {
            return { category: aliasMatch, confidence: 0.95, isExact: false };
        }
        return { category: aliasTarget, confidence: 0.85, isExact: false };
    }

    // 3. Fuzzy match (Levenshtein distance)
    if (knownCategories.length > 0) {
        let bestMatch = knownCategories[0];
        let bestDistance = levenshtein(normalized.toLowerCase(), bestMatch.toLowerCase());

        for (const candidate of knownCategories) {
            const dist = levenshtein(normalized.toLowerCase(), candidate.toLowerCase());
            if (dist < bestDistance) {
                bestDistance = dist;
                bestMatch = candidate;
            }
        }

        // Confidence based on edit distance ratio
        const maxLen = Math.max(normalized.length, bestMatch.length);
        const similarity = 1 - bestDistance / maxLen;

        if (similarity >= 0.7) {
            return {
                category: bestMatch,
                confidence: similarity,
                isExact: false,
            };
        }
    }

    // 4. No match — return normalized form with low confidence
    return { category: normalized, confidence: 0.3, isExact: false };
}

// ─── Levenshtein Distance ───────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }

    return dp[m][n];
}
