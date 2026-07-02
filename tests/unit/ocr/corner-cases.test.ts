// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
    parseOcrText,
    isNoiseLine,
    isBudgetTogetherEntry,
    extractAmountFromLine,
} from "@/lib/ocr/parser";
import { normalizeCategory, matchCategory } from "@/lib/ocr/category-matcher";
import { deduplicateEntries } from "@/lib/ocr/deduplicator";

describe("Corner Cases — Parser", () => {
    describe("isBudgetTogetherEntry edge cases", () => {
        it("rejects real Budget Together entries", () => {
            expect(isBudgetTogetherEntry("Clothes: ₹170.00")).toBe(true);
            expect(isBudgetTogetherEntry("Electronics: ₹110.00")).toBe(true);
            expect(isBudgetTogetherEntry("Insurance: ₹0.00")).toBe(true);
            expect(isBudgetTogetherEntry("Groceries: 23.00")).toBe(true);
        });

        it("does NOT false-positive on semicolons from OCR noise", () => {
            // OCR can produce semicolons randomly — should not be treated as budget-together
            expect(isBudgetTogetherEntry("Electronics;34,317.00")).toBe(false);
        });

        it("does NOT false-positive on very short words before colon", () => {
            // 2-letter "words" before colon are likely OCR noise, not real categories
            expect(isBudgetTogetherEntry("Re: 500")).toBe(false);
        });

        it("does NOT flag normal space-separated entries", () => {
            expect(isBudgetTogetherEntry("Investments   ₹2,00,077.00")).toBe(false);
            expect(isBudgetTogetherEntry("Rent  ₹15,000.00")).toBe(false);
            expect(isBudgetTogetherEntry("Flight    ₹12,400.00")).toBe(false);
        });

        it("does NOT flag lines with 2+ spaces before number as budget-together", () => {
            // Lines like "Rent   ₹15,000" have list-style spacing — not colon-separated
            expect(isBudgetTogetherEntry("Home Supplies  ₹2,624.75")).toBe(false);
        });
    });

    describe("Pattern D — OCR ₹-as-digit", () => {
        it("extracts entries when ₹ is misread as digit 3", () => {
            const text = `
® Flight 312,400.00
mn Food 39,824.80
+ Groceries 38,066.39
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(3);

            const flight = result.find((e) => e.category.toLowerCase().includes("flight"));
            expect(flight).toBeDefined();
            expect(flight!.amount).toBeCloseTo(12400, 0);
        });

        it("extracts entries when ₹ is misread as digit 2", () => {
            const text = `
® Hotel 26,838.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].amount).toBeCloseTo(6838, 0);
        });

        it("extracts entries when ₹ is misread as %", () => {
            const text = `
@ Investments %2,00,077.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].amount).toBeCloseTo(200077, 0);
        });

        it("extracts entries when ₹ is misread as $", () => {
            const text = `
® Doctor $791.90
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].amount).toBeCloseTo(791.9, 1);
        });

        it("handles Pattern D with small amounts (no comma)", () => {
            const text = `
® Cinema 3392.00
Ww Shopping 3387.03
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(2);

            const cinema = result.find((e) => e.category.toLowerCase().includes("cinema"));
            expect(cinema).toBeDefined();
            expect(cinema!.amount).toBeCloseTo(392, 0);
        });

        it("gives Pattern D lower confidence than Pattern A", () => {
            const textA = `Investments ₹2,00,077.00`;
            const textD = `@ investments 32,00,077.00`;

            const resultA = parseOcrText(textA, "test.png");
            const resultD = parseOcrText(textD, "test.png");

            expect(resultA[0].confidence).toBeGreaterThan(resultD[0].confidence);
        });
    });

    describe("parseOcrText — full OCR-like input", () => {
        it("handles realistic full OCR output from IMG_2806", () => {
            const text = `
CHE 4 all © ED
& Investments %2,00,077.00
& Rent 215,000.00
¥ Flight 312,400.00
mn Food 39,824.80
+ Groceries 38,066.39
Es Hotel 26,838.00
2 Electronics 34,317.00
@ Home supplies 32,624.75
o Entertainment 32,255.00
2 Electricity 32,170.00
      `;
            const result = parseOcrText(text, "IMG_2806.PNG");

            // Should extract at least 8 entries
            expect(result.length).toBeGreaterThanOrEqual(8);

            // Verify first line noise was rejected
            const categories = result.map((e) => e.category.toLowerCase());
            expect(categories).not.toContain("che");
        });

        it("handles realistic OCR output from IMG_2807", () => {
            const text = `
(se) Rapido 22,039.00
= Service 31,969.42
# Gym 31,449.00
yw Gift 31,272.00
® Doctor $791.90
®: Cinema 3392.00
Ww Shopping 3387.03
      `;
            const result = parseOcrText(text, "IMG_2807.PNG");
            expect(result.length).toBeGreaterThanOrEqual(5);
        });
    });
});

describe("Corner Cases — Category Matcher", () => {
    describe("normalizeCategory icon prefix stripping", () => {
        it("strips 2-letter uppercase icon prefix", () => {
            expect(normalizeCategory("Oo Rapido")).toBe("Rapido");
            expect(normalizeCategory("Ww Shopping")).toBe("Shopping");
        });

        it("strips 2-letter lowercase icon prefix (case-insensitive)", () => {
            expect(normalizeCategory("mn food")).toBe("Food");
            expect(normalizeCategory("es hotel")).toBe("Hotel");
        });

        it("strips single-letter icon prefix", () => {
            expect(normalizeCategory("o Entertainment")).toBe("Entertainment");
        });

        it("does NOT strip 3+ letter real category prefixes", () => {
            // "Home Supplies" should NOT strip "Home" (4 letters)
            expect(normalizeCategory("Home Supplies")).toBe("Home Supplies");
        });

        it("does NOT strip if remaining text is too short", () => {
            // "Oo Ab" — "Ab" is only 2 chars, less than the 3-char minimum for lookahead
            expect(normalizeCategory("Oo Ab")).toBe("Oo Ab");
        });

        it("handles multiple leading junk characters", () => {
            expect(normalizeCategory("@ Rent")).toBe("Rent");
            expect(normalizeCategory("® Flight")).toBe("Flight");
            expect(normalizeCategory("+ Groceries")).toBe("Groceries");
        });
    });

    describe("matchCategory fuzzy edge cases", () => {
        const known = [
            "Investments",
            "Rent",
            "Food",
            "Groceries",
            "Flight",
            "Hotel",
            "Electronics",
            "Entertainment",
            "Electricity",
            "Home Supplies",
            "Rapido",
            "Services",
            "Gym",
            "Doctor",
            "Gift",
            "Cinema",
            "Shopping",
        ];

        it("matches exact categories", () => {
            const result = matchCategory("Rent", known);
            expect(result.category).toBe("Rent");
            expect(result.isExact).toBe(true);
        });

        it("matches via alias", () => {
            const result = matchCategory("medical", known);
            expect(result.category).toBe("Doctor");
        });

        it("fuzzy-matches close misspellings", () => {
            const result = matchCategory("Investmnts", known);
            expect(result.category).toBe("Investments");
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        it("returns low confidence for unrecognized categories", () => {
            const result = matchCategory("Xyzzyplugh", known);
            expect(result.confidence).toBeLessThan(0.5);
        });

        it("handles OCR-truncated categories", () => {
            // OCR sometimes truncates — "re" for "Rent" (now an alias)
            const result = matchCategory("re", known);
            expect(result.category).toBe("Rent");
            expect(result.confidence).toBe(1.0);
        });
    });
});

describe("Corner Cases — Deduplicator", () => {
    it("handles entries with 0 confidence gracefully", () => {
        const result = deduplicateEntries([
            [
                {
                    category: "Rent",
                    amount: 15000,
                    confidence: 0,
                    sourceImage: "img1",
                    lineIndex: 0,
                },
            ],
        ]);
        expect(result.length).toBe(1);
        expect(result[0].confidence).toBe(0);
        expect(result[0].conflict).toBe(false);
    });

    it("handles very large batches without crashing", () => {
        const entries = Array.from({ length: 100 }, (_, i) => ({
            category: `Category${i}`,
            amount: (i + 1) * 100,
            confidence: 0.7,
            sourceImage: `img_${i % 5}`,
            lineIndex: i,
        }));

        // Split into 5 "images"
        const batches = Array.from({ length: 5 }, (_, i) =>
            entries.filter((_, idx) => idx % 5 === i)
        );

        const result = deduplicateEntries(batches);
        expect(result.length).toBe(100); // all unique
    });

    it("resolves conflicts by highest confidence", () => {
        const result = deduplicateEntries([
            [
                {
                    category: "Rent",
                    amount: 15000,
                    confidence: 0.6,
                    sourceImage: "img1",
                    lineIndex: 0,
                },
            ],
            [
                {
                    category: "Rent",
                    amount: 14000,
                    confidence: 0.9,
                    sourceImage: "img2",
                    lineIndex: 0,
                },
            ],
        ]);

        expect(result.length).toBe(1);
        expect(result[0].amount).toBe(14000); // higher confidence wins
        expect(result[0].conflict).toBe(true);
        expect(result[0].conflictingAmounts).toHaveLength(2);
    });

    it("handles empty category names after normalization", () => {
        const result = deduplicateEntries([
            [
                {
                    category: "   ",
                    amount: 100,
                    confidence: 0.5,
                    sourceImage: "img1",
                    lineIndex: 0,
                },
            ],
        ]);
        // Empty category after normalization should be skipped
        expect(result.length).toBe(0);
    });
});

describe("Corner Cases — extractAmountFromLine", () => {
    it("extracts amounts with % as ₹ substitute", () => {
        expect(extractAmountFromLine("Investments %2,00,077.00")).toBeCloseTo(200077, 1);
    });

    it("extracts amounts with $ as ₹ substitute", () => {
        expect(extractAmountFromLine("Doctor $791.90")).toBeCloseTo(791.9, 1);
    });

    it("handles amounts with no commas", () => {
        expect(extractAmountFromLine("item 392.00")).toBeCloseTo(392, 1);
    });

    it("returns NaN for text-only lines", () => {
        expect(extractAmountFromLine("Overview Budget Wallets")).toBeNaN();
    });

    it("handles very large Indian format numbers", () => {
        expect(extractAmountFromLine("Big ₹12,34,56,789.50")).toBeCloseTo(123456789.5, 1);
    });
});

describe("Corner Cases — isNoiseLine", () => {
    it("rejects EXPENSES with arrow indicators", () => {
        expect(isNoiseLine("EXPENSES ▼")).toBe(true);
        expect(isNoiseLine("EXPENSES▲")).toBe(true);
    });

    it("rejects standalone digits", () => {
        expect(isNoiseLine("193")).toBe(true);
        expect(isNoiseLine("0")).toBe(true);
    });

    it("rejects 'you'd like' promotional text", () => {
        expect(isNoiseLine("you'd like to track")).toBe(true);
    });

    it("accepts valid single-word categories", () => {
        expect(isNoiseLine("Investments")).toBe(false);
        expect(isNoiseLine("Rent")).toBe(false);
        expect(isNoiseLine("Rapido")).toBe(false);
    });

    it("accepts lines with amounts (they are not noise)", () => {
        expect(isNoiseLine("Rent ₹15,000.00")).toBe(false);
    });
});
