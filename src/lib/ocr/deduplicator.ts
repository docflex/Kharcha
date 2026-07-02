import { normalizeCategory } from "./category-matcher";
import type { ExtractedEntry, DeduplicatedEntry } from "./types";

/**
 * Deduplicate extracted entries across multiple screenshots.
 *
 * Groups by normalized category name, then:
 * - If all entries agree on amount → take highest confidence, no conflict
 * - If amounts differ → take highest confidence, flag conflict with details
 */
export function deduplicateEntries(allEntries: ExtractedEntry[][]): DeduplicatedEntry[] {
    const byCategory = new Map<string, ExtractedEntry[]>();

    for (const imageEntries of allEntries) {
        for (const entry of imageEntries) {
            const key = normalizeCategory(entry.category).toLowerCase();
            if (!key) continue;

            if (!byCategory.has(key)) {
                byCategory.set(key, []);
            }
            byCategory.get(key)!.push(entry);
        }
    }

    const results: DeduplicatedEntry[] = [];

    for (const [, entries] of byCategory) {
        if (entries.length === 1) {
            const e = entries[0];
            results.push({
                ...e,
                category: normalizeCategory(e.category),
                conflict: false,
            });
            continue;
        }

        // Multiple entries for the same category
        const amounts = new Set(entries.map((e) => e.amount));
        const best = entries.reduce((a, b) => (a.confidence > b.confidence ? a : b));

        if (amounts.size === 1) {
            // All amounts agree — no conflict, boost confidence (cross-image validation)
            const crossImageBoost = Math.min(entries.length * 0.03, 0.08);
            results.push({
                ...best,
                category: normalizeCategory(best.category),
                confidence: Math.min(best.confidence + crossImageBoost, 1.0),
                conflict: false,
            });
        } else {
            // Amounts differ — conflict!
            results.push({
                ...best,
                category: normalizeCategory(best.category),
                conflict: true,
                conflictingAmounts: entries.map((e) => ({
                    amount: e.amount,
                    confidence: e.confidence,
                    source: e.sourceImage,
                })),
            });
        }
    }

    return results;
}
