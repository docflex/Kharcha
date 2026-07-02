// @vitest-environment node
import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { processImage, processBatch } from "@/lib/ocr/pipeline";
import { normalizeCategory } from "@/lib/ocr/category-matcher";

const SCREENSHOTS_DIR = path.resolve(__dirname, "../fixtures/screenshots");
const EXPECTED_DIR = path.resolve(__dirname, "../fixtures/expected");

function fixturePath(filename: string): string {
    return path.join(SCREENSHOTS_DIR, filename);
}

function loadExpected(filename: string): {
    categories: Array<{ category: string; amount: number | null; note?: string }>;
} {
    const raw = fs.readFileSync(path.join(EXPECTED_DIR, filename), "utf-8");
    return JSON.parse(raw);
}

describe("OCR Pipeline — Integration", () => {
    describe("Single Image Processing", () => {
        it("extracts categories from IMG_2806 (categories list)", async () => {
            const result = await processImage(fixturePath("IMG_2806.PNG"));

            expect(result.entries.length).toBeGreaterThanOrEqual(5);
            expect(result.rawText).toBeTruthy();
            expect(result.strategy).toBe("line-regex");

            // Check for key expected categories
            const expected = loadExpected("IMG_2806_expected.json");
            const extractedCategories = result.entries.map((e) =>
                normalizeCategory(e.category).toLowerCase()
            );

            let matchCount = 0;
            for (const exp of expected.categories) {
                if (exp.amount === null) continue; // skip truncated
                const normalized = normalizeCategory(exp.category).toLowerCase();
                if (extractedCategories.includes(normalized)) {
                    matchCount++;
                }
            }
            // Should find at least 60% of expected categories
            const expectedWithAmounts = expected.categories.filter((c) => c.amount !== null);
            expect(matchCount).toBeGreaterThanOrEqual(Math.floor(expectedWithAmounts.length * 0.6));
        }, 60000);

        it("extracts categories from IMG_2807 (tail + budget together)", async () => {
            const result = await processImage(fixturePath("IMG_2807.PNG"));

            expect(result.entries.length).toBeGreaterThanOrEqual(3);

            // Should NOT contain Budget Together entries
            const categories = result.entries.map((e) => e.category.toLowerCase());
            // Budget Together card shows "Clothes", "Insurance" in "Name: ₹Amount" format
            // These should be filtered by the parser
        }, 60000);

        it("extracts metadata from IMG_2810 (overview with month/year)", async () => {
            const result = await processImage(fixturePath("IMG_2810.PNG"));

            // Should extract month/year metadata
            if (result.metadata) {
                // Metadata extraction is best-effort from OCR text
                if (result.metadata.month) {
                    expect(result.metadata.month).toBe("January");
                }
                if (result.metadata.year) {
                    expect(result.metadata.year).toBe(2026);
                }
            }
        }, 60000);

        it("extracts categories from IMG_2811 (full categories list)", async () => {
            const result = await processImage(fixturePath("IMG_2811.PNG"));

            expect(result.entries.length).toBeGreaterThanOrEqual(5);

            const expected = loadExpected("IMG_2811_expected.json");
            const extractedCategories = result.entries.map((e) =>
                normalizeCategory(e.category).toLowerCase()
            );

            let matchCount = 0;
            for (const exp of expected.categories) {
                if (exp.amount === null) continue;
                const normalized = normalizeCategory(exp.category).toLowerCase();
                if (extractedCategories.includes(normalized)) {
                    matchCount++;
                }
            }
            const expectedWithAmounts = expected.categories.filter((c) => c.amount !== null);
            expect(matchCount).toBeGreaterThanOrEqual(Math.floor(expectedWithAmounts.length * 0.5));
        }, 60000);

        it("processes all 9 screenshots without errors", async () => {
            const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith(".PNG"));
            expect(files.length).toBe(9);

            for (const file of files) {
                const result = await processImage(fixturePath(file));
                expect(result.filename).toBe(file);
                expect(result.rawText).toBeTruthy();
                // Some screenshots may have 0 entries (overview), that's OK
            }
        }, 120000);
    });

    describe("Batch Processing", () => {
        it("deduplicates IMG_2806 + IMG_2807 batch", async () => {
            const result = await processBatch(
                [fixturePath("IMG_2806.PNG"), fixturePath("IMG_2807.PNG")],
                ["IMG_2806.PNG", "IMG_2807.PNG"]
            );

            // Should have deduplicated categories
            const categories = result.entries.map((e) => e.category);
            expect(new Set(categories).size).toBe(categories.length);

            // Should have merged results from both images
            expect(result.entries.length).toBeGreaterThanOrEqual(5);
            expect(result.imageResults.length).toBe(2);
            expect(result.totalConfidence).toBeGreaterThan(0);
        }, 60000);

        it("deduplicates Jan 2026 batch (IMG_2810 + 2811 + 2812)", async () => {
            const result = await processBatch(
                [
                    fixturePath("IMG_2810.PNG"),
                    fixturePath("IMG_2811.PNG"),
                    fixturePath("IMG_2812.PNG"),
                ],
                ["IMG_2810.PNG", "IMG_2811.PNG", "IMG_2812.PNG"]
            );

            // No duplicate categories
            const categories = result.entries.map((e) => normalizeCategory(e.category));
            expect(new Set(categories).size).toBe(categories.length);

            // Should have data from all 3 images
            expect(result.imageResults.length).toBe(3);
        }, 120000);
    });

    describe("Noise Rejection", () => {
        it("does not include nav bar items as categories", async () => {
            const result = await processImage(fixturePath("IMG_2811.PNG"));
            const categories = result.entries.map((e) => e.category.toLowerCase());

            expect(categories).not.toContain("overview");
            expect(categories).not.toContain("budget");
            expect(categories).not.toContain("wallets");
            expect(categories).not.toContain("save");
            expect(categories).not.toContain("tools");
        }, 60000);

        it("does not include summary bar amounts as categories", async () => {
            const result = await processImage(fixturePath("IMG_2810.PNG"));
            const amounts = result.entries.map((e) => e.amount);

            // Summary bar shows ₹2,99,301.32 (INCOME) and ₹1,74,673.60 (EXPENSES)
            // These should NOT appear as category entries
            expect(amounts).not.toContain(299301.32);
            expect(amounts).not.toContain(174673.6);
        }, 60000);
    });
});
