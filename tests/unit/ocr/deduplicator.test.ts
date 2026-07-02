// @vitest-environment node
import { describe, it, expect } from "vitest";
import { deduplicateEntries } from "@/lib/ocr/deduplicator";
import type { ExtractedEntry } from "@/lib/ocr/types";

function makeEntry(
    category: string,
    amount: number,
    confidence: number,
    sourceImage: string,
    lineIndex: number = 0
): ExtractedEntry {
    return { category, amount, confidence, sourceImage, lineIndex };
}

describe("Deduplication Engine", () => {
    it("passes through unique categories unchanged", () => {
        const entries: ExtractedEntry[][] = [
            [makeEntry("Rent", 15000, 0.9, "img1.png"), makeEntry("Food", 9824.8, 0.8, "img1.png")],
        ];
        const result = deduplicateEntries(entries);
        expect(result.length).toBe(2);
        expect(result.every((e) => !e.conflict)).toBe(true);
    });

    it("deduplicates same category with same amount (takes highest confidence)", () => {
        const entries: ExtractedEntry[][] = [
            [makeEntry("Rent", 15000, 0.7, "img1.png")],
            [makeEntry("Rent", 15000, 0.9, "img2.png")],
        ];
        const result = deduplicateEntries(entries);
        expect(result.length).toBe(1);
        expect(result[0].amount).toBe(15000);
        // Cross-image boost: 0.9 + min(2 * 0.03, 0.08) = 0.96
        expect(result[0].confidence).toBeCloseTo(0.96, 2);
        expect(result[0].conflict).toBe(false);
    });

    it("flags conflict when same category has different amounts", () => {
        const entries: ExtractedEntry[][] = [
            [makeEntry("Food", 9824.8, 0.7, "img1.png")],
            [makeEntry("Food", 9932.0, 0.9, "img2.png")],
        ];
        const result = deduplicateEntries(entries);
        expect(result.length).toBe(1);
        expect(result[0].conflict).toBe(true);
        expect(result[0].conflictingAmounts).toBeDefined();
        expect(result[0].conflictingAmounts!.length).toBe(2);
        // Should take the higher-confidence entry
        expect(result[0].amount).toBe(9932.0);
        expect(result[0].confidence).toBe(0.9);
    });

    it("normalizes category names for dedup (case-insensitive)", () => {
        const entries: ExtractedEntry[][] = [
            [makeEntry("Home supplies", 2624.75, 0.7, "img1.png")],
            [makeEntry("Home Supplies", 2624.75, 0.9, "img2.png")],
        ];
        const result = deduplicateEntries(entries);
        expect(result.length).toBe(1);
        expect(result[0].category).toBe("Home Supplies");
        expect(result[0].conflict).toBe(false);
    });

    it("resolves aliases during dedup (Service -> Services)", () => {
        const entries: ExtractedEntry[][] = [
            [makeEntry("Service", 1969.42, 0.7, "img1.png")],
            [makeEntry("Services", 1969.42, 0.9, "img2.png")],
        ];
        const result = deduplicateEntries(entries);
        expect(result.length).toBe(1);
        expect(result[0].category).toBe("Services");
    });

    it("handles multi-screenshot batch with heavy overlap", () => {
        // Simulates IMG_2806 + IMG_2807 overlap
        const img1: ExtractedEntry[] = [
            makeEntry("Investments", 200077, 0.9, "img1.png"),
            makeEntry("Rent", 15000, 0.9, "img1.png"),
            makeEntry("Entertainment", 2255, 0.9, "img1.png"),
            makeEntry("Electricity", 2170, 0.9, "img1.png"),
            makeEntry("Rapido", 2039, 0.9, "img1.png"),
            makeEntry("Services", 1969.42, 0.9, "img1.png"),
            makeEntry("Gym", 1449, 0.8, "img1.png"),
        ];

        const img2: ExtractedEntry[] = [
            // Overlap: same categories with same amounts
            makeEntry("Entertainment", 2255, 0.85, "img2.png"),
            makeEntry("Electricity", 2170, 0.85, "img2.png"),
            makeEntry("Rapido", 2039, 0.85, "img2.png"),
            makeEntry("Services", 1969.42, 0.85, "img2.png"),
            makeEntry("Gym", 1449, 0.85, "img2.png"),
            // New categories only in img2
            makeEntry("Gift", 1272, 0.9, "img2.png"),
            makeEntry("Doctor", 791.9, 0.9, "img2.png"),
            makeEntry("Cinema", 392, 0.9, "img2.png"),
            makeEntry("Shopping", 387.03, 0.9, "img2.png"),
        ];

        const result = deduplicateEntries([img1, img2]);

        // Should have unique categories from both images
        const categories = result.map((e) => e.category);
        expect(new Set(categories).size).toBe(categories.length);

        // All expected categories present
        expect(categories).toContain("Investments");
        expect(categories).toContain("Rent");
        expect(categories).toContain("Gift");
        expect(categories).toContain("Doctor");
        expect(categories).toContain("Cinema");
        expect(categories).toContain("Shopping");

        // No conflicts (all overlapping amounts agree)
        expect(result.every((e) => !e.conflict)).toBe(true);
    });

    it("handles empty input", () => {
        expect(deduplicateEntries([])).toEqual([]);
        expect(deduplicateEntries([[]])).toEqual([]);
    });

    it("handles single image with no duplicates", () => {
        const entries: ExtractedEntry[][] = [
            [
                makeEntry("Rent", 15000, 0.9, "img1.png"),
                makeEntry("Food", 9824.8, 0.8, "img1.png"),
                makeEntry("Groceries", 8066.39, 0.85, "img1.png"),
            ],
        ];
        const result = deduplicateEntries(entries);
        expect(result.length).toBe(3);
    });

    it("preserves lineIndex and sourceImage from best entry", () => {
        const entries: ExtractedEntry[][] = [
            [makeEntry("Rent", 15000, 0.7, "img1.png", 3)],
            [makeEntry("Rent", 15000, 0.9, "img2.png", 1)],
        ];
        const result = deduplicateEntries(entries);
        expect(result[0].sourceImage).toBe("img2.png"); // higher confidence
        expect(result[0].lineIndex).toBe(1);
    });
});
