// @vitest-environment node
/**
 * OCR Golden Test Suite
 *
 * Validates the full OCR pipeline (preprocess → recognize → parse → match → dedup)
 * against 13 months of real Buddy app screenshots with known expected values.
 *
 * Each month has a pair of screenshots (top + bottom of the category list).
 * The test processes both as a batch (with deduplication) and asserts that
 * every expected category+amount appears in the output.
 *
 * Source: /Users/rmoin/Downloads/Personal/Sample/IMG_2817.PNG – IMG_2843.PNG
 */
import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { processBatch } from "@/lib/ocr/pipeline";

const SAMPLE_DIR = path.resolve(__dirname, "../../../Sample");
const FIXTURES_EXIST = fs.existsSync(path.join(SAMPLE_DIR, "IMG_2817.PNG"));

// ─── Expected data per month ────────────────────────────────────────────────
// Each entry: [normalizedCategory, expectedAmount]
// Category names are the canonical forms after normalization.

interface MonthFixture {
    label: string;
    images: [string, string];
    expected: Record<string, number>;
}

const MONTHS: MonthFixture[] = [
    {
        label: "January 2025",
        images: ["IMG_2817.PNG", "IMG_2818.PNG"],
        expected: {
            Investments: 190000,
            Rent: 15000,
            Food: 11110.1,
            "Home Supplies": 4430.75,
            Entertainment: 2722,
            Groceries: 2657,
            Rapido: 1645,
            Bank: 1625.05,
            Services: 1460,
            Doctor: 885,
            Laundry: 700,
            Electronics: 601,
            Taxi: 517,
            Electricity: 280,
            Gift: 235,
        },
    },
    {
        label: "February 2025",
        images: ["IMG_2819.PNG", "IMG_2820.PNG"],
        expected: {
            Investments: 150000,
            Rent: 15000,
            Food: 11438.5,
            Groceries: 4577,
            Cinema: 1853.4,
            Services: 1589,
            Electronics: 1219,
            Gift: 1042,
            Entertainment: 1028,
            Rapido: 697,
            Electricity: 580,
            Doctor: 251,
            "Home Supplies": 188,
        },
    },
    {
        label: "March 2025",
        images: ["IMG_2821.PNG", "IMG_2822.PNG"],
        expected: {
            Investments: 137900,
            Gift: 20250,
            Rent: 15000,
            Flight: 11572,
            Food: 9647.5,
            Groceries: 5446.82,
            Services: 942.2,
            Rapido: 870,
            Telephone: 600,
            Electricity: 550,
            Taxi: 401,
            Miscellaneous: 193,
        },
    },
    {
        label: "April 2025",
        images: ["IMG_2823.PNG", "IMG_2824.PNG"],
        expected: {
            Investments: 69100,
            Rent: 15000,
            Food: 12069.96,
            Groceries: 5676.46,
            Shopping: 4635,
            Rapido: 1717,
            Services: 1595,
            Gift: 452,
            Electricity: 450,
            Taxi: 302,
            "Home Supplies": 205,
        },
    },
    {
        label: "May 2025",
        images: ["IMG_2825.PNG", "IMG_2826.PNG"],
        expected: {
            Investments: 182000,
            Rent: 15000,
            Food: 9214,
            Groceries: 6482.84,
            Cinema: 3052.16,
            Rapido: 1582,
            Shopping: 1299,
            Electricity: 1290,
            Services: 1265,
            Doctor: 99,
            "Home Supplies": 30,
        },
    },
    {
        label: "June 2025",
        images: ["IMG_2827.PNG", "IMG_2828.PNG"],
        expected: {
            Investments: 85000,
            Rent: 15000,
            Food: 10120.35,
            Groceries: 5394.5,
            Cinema: 3304.36,
            "Home Supplies": 3002.55,
            Services: 2729,
            Shopping: 1957.6,
            Entertainment: 1418,
            Doctor: 1402.98,
            Electricity: 1060,
            Rapido: 784,
            Gym: 400,
            Gift: 198,
        },
    },
    {
        label: "July 2025",
        images: ["IMG_2829.PNG", "IMG_2830.PNG"],
        expected: {
            Investments: 60000,
            Gym: 29400,
            Rent: 15000,
            Food: 10020,
            Groceries: 5517.79,
            Shopping: 4396,
            Cinema: 3314.36,
            Electricity: 2290,
            Rapido: 1976,
            Services: 1315,
            Electronics: 636,
            "Home Supplies": 5,
        },
    },
    {
        label: "August 2025",
        images: ["IMG_2831.PNG", "IMG_2832.PNG"],
        expected: {
            Investments: 89394.23,
            Rent: 15000,
            Food: 12375,
            Groceries: 6518.65,
            Shopping: 6493,
            Gym: 4580,
            Electricity: 1870,
            Rapido: 1659,
            Services: 1165,
            Doctor: 512.4,
            Cinema: 435.8,
            "Home Supplies": 72,
        },
    },
    {
        label: "September 2025",
        images: ["IMG_2833.PNG", "IMG_2834.PNG"],
        expected: {
            Investments: 70000,
            Rent: 15000,
            Food: 9837,
            Groceries: 5733.5,
            Electricity: 1630,
            Rapido: 1202,
            Services: 1106,
            Gift: 562,
            Doctor: 481,
            Entertainment: 328,
            Shopping: 320,
        },
    },
    {
        label: "October 2025",
        images: ["IMG_2835.PNG", "IMG_2836.PNG"],
        expected: {
            Investments: 105012,
            Rent: 15000,
            Flight: 11424,
            Food: 9365.32,
            Groceries: 8529.99,
            Services: 5925,
            Electronics: 5058.82,
            Shopping: 4173,
            Entertainment: 2270.46,
            Rapido: 2187,
            Electricity: 1770,
            Cinema: 1749,
            Gift: 745.14,
            "Home Supplies": 72,
        },
    },
    {
        label: "November 2025",
        images: ["IMG_2837.PNG", "IMG_2838.PNG"],
        expected: {
            Investments: 70000,
            Rent: 15000,
            Flight: 10483,
            Food: 9980.56,
            Hotel: 7997,
            Groceries: 7259.75,
            Electronics: 4317,
            "Home Supplies": 2486,
            Gift: 2236,
            Entertainment: 1844,
            Rapido: 1761,
            Services: 1166,
            Gym: 1100,
            Electricity: 750,
            Doctor: 333,
        },
    },
    {
        label: "December 2025",
        images: ["IMG_2839.PNG", "IMG_2841.PNG"],
        expected: {
            Investments: 71240,
            Rent: 15000,
            Gift: 11496.46,
            Shopping: 11146,
            Services: 5758,
            Food: 5728,
            Doctor: 5350,
            Groceries: 4465,
            Electronics: 4317,
            Taxi: 2674,
            Flight: 2457,
            Rapido: 1153,
            Cinema: 565,
            Electricity: 520,
        },
    },
    {
        label: "January 2026",
        images: ["IMG_2842.PNG", "IMG_2843.PNG"],
        expected: {
            Investments: 118000,
            Rent: 15000,
            Food: 9932,
            Groceries: 6989.5,
            Shopping: 6459,
            Electronics: 4317,
            "Home Supplies": 4001,
            Services: 3241.03,
            Rapido: 2131,
            Entertainment: 1661,
            Taxi: 1114.45,
            Doctor: 835.8,
            Cinema: 741.82,
            Electricity: 250,
        },
    },
];

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe.skipIf(!FIXTURES_EXIST)("OCR Golden Tests — Full Year Validation", () => {
    for (const month of MONTHS) {
        describe(month.label, () => {
            it(`extracts all ${Object.keys(month.expected).length} categories with correct amounts`, async () => {
                const imagePaths = month.images.map((f) => path.join(SAMPLE_DIR, f));
                const result = await processBatch(imagePaths, month.images);

                const extracted = new Map<string, number>();
                for (const entry of result.entries) {
                    // Use the highest-confidence entry for each category
                    const existing = extracted.get(entry.category);
                    if (!existing || entry.confidence > 0) {
                        extracted.set(entry.category, entry.amount);
                    }
                }

                const expectedEntries = Object.entries(month.expected);

                // Check each expected category exists and has the right amount
                const missing: string[] = [];
                const wrongAmount: string[] = [];

                for (const [category, expectedAmount] of expectedEntries) {
                    const actualAmount = extracted.get(category);
                    if (actualAmount === undefined) {
                        missing.push(`${category} (expected ₹${expectedAmount})`);
                    } else if (Math.abs(actualAmount - expectedAmount) > 0.5) {
                        wrongAmount.push(
                            `${category}: expected ₹${expectedAmount}, got ₹${actualAmount}`
                        );
                    }
                }

                // Report all failures at once for easier debugging
                const failures: string[] = [];
                if (missing.length > 0) {
                    failures.push(`MISSING categories:\n  - ${missing.join("\n  - ")}`);
                }
                if (wrongAmount.length > 0) {
                    failures.push(`WRONG amounts:\n  - ${wrongAmount.join("\n  - ")}`);
                }

                if (failures.length > 0) {
                    const actualList = [...extracted.entries()]
                        .map(([c, a]) => `${c}=₹${a}`)
                        .join(", ");
                    expect.fail(
                        `${month.label}: ${failures.join("\n")}\n\nActual extracted: ${actualList}`
                    );
                }
            }, 30000); // 30s timeout per month (OCR is slow)

            it("has no unexpected duplicates after deduplication", async () => {
                const imagePaths = month.images.map((f) => path.join(SAMPLE_DIR, f));
                const result = await processBatch(imagePaths, month.images);

                // Check that no category appears more than once
                const categories = result.entries.map((e) => e.category);
                const uniqueCategories = new Set(categories);
                const duplicates = categories.filter((c, i) => categories.indexOf(c) !== i);

                if (duplicates.length > 0) {
                    expect.fail(
                        `${month.label}: Duplicate categories after dedup: ${[...new Set(duplicates)].join(", ")}`
                    );
                }

                expect(categories.length).toBe(uniqueCategories.size);
            }, 30000);
        });
    }

    it("processes all 26 screenshots without errors", async () => {
        // Quick sanity check that no image throws
        for (const month of MONTHS) {
            const imagePaths = month.images.map((f) => path.join(SAMPLE_DIR, f));
            const result = await processBatch(imagePaths, month.images);
            expect(result.entries.length).toBeGreaterThan(0);
        }
    }, 300000); // 5 min for all 13 months
});
