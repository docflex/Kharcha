// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
    parseOcrText,
    isNoiseLine,
    isBudgetTogetherEntry,
    extractAmountFromLine,
} from "@/lib/ocr/parser";

describe("Text Parser", () => {
    describe("parseOcrText — line-regex strategy", () => {
        it("extracts category-amount pairs from clean OCR text", () => {
            const text = `
HEAD CATEGORIES    CATEGORIES
Investments        ₹2,00,077.00
Rent               ₹15,000.00
Flight             ₹12,400.00
Food               ₹9,824.80
Groceries          ₹8,066.39
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(5);

            const investments = result.find((e) => e.category === "Investments");
            expect(investments).toBeDefined();
            expect(investments!.amount).toBeCloseTo(200077.0, 1);

            const rent = result.find((e) => e.category === "Rent");
            expect(rent).toBeDefined();
            expect(rent!.amount).toBeCloseTo(15000.0, 1);
        });

        it("handles amounts without ₹ symbol", () => {
            const text = `
Investments        2,00,077.00
Rent               15,000.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        it("handles amounts with R or Rs instead of ₹", () => {
            const text = `
Investments        R2,00,077.00
Rent               Rs 15,000.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        it("handles amounts without decimal places", () => {
            const text = `
Rent               ₹15,000
Electronics        ₹4,317
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(2);
            const rent = result.find((e) => e.category === "Rent");
            expect(rent!.amount).toBeCloseTo(15000, 1);
        });

        it("handles Indian number format (lakhs)", () => {
            const text = `
Investments        ₹2,00,077.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result[0].amount).toBeCloseTo(200077, 1);
        });

        it("handles small amounts", () => {
            const text = `
Shopping           ₹387.03
Cinema             ₹392.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBe(2);
            const shopping = result.find((e) => e.category === "Shopping");
            expect(shopping!.amount).toBeCloseTo(387.03, 1);
        });

        it("filters out noise lines", () => {
            const text = `
9:11
HEAD CATEGORIES    CATEGORIES
Investments        ₹2,00,077.00
Overview           Budget     Wallets     Save     Tools
      `;
            const result = parseOcrText(text, "test.png");
            // Only Investments should be extracted
            expect(result.length).toBe(1);
            expect(result[0].category).toBe("Investments");
        });

        it("rejects Budget Together entries (colon format)", () => {
            const text = `
Shopping           ₹387.03
Clothes: ₹170.00
Electronics: ₹110.00
Groceries: ₹23.00
Budget together
      `;
            const result = parseOcrText(text, "test.png");
            // Only Shopping should remain (space-separated, no colon)
            expect(result.length).toBe(1);
            expect(result[0].category).toBe("Shopping");
        });

        it("handles OCR artifacts (extra spaces, special chars)", () => {
            const text = `
  @ Investments        ₹2,00,077.00
  @ Rent               ₹15,000.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        it("assigns confidence scores", () => {
            const text = `
Investments        ₹2,00,077.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result[0].confidence).toBeGreaterThan(0);
            expect(result[0].confidence).toBeLessThanOrEqual(1);
        });

        it("assigns source image filename", () => {
            const text = `Rent ₹15,000.00`;
            const result = parseOcrText(text, "IMG_2806.PNG");
            expect(result[0].sourceImage).toBe("IMG_2806.PNG");
        });

        it("handles multi-word category names", () => {
            const text = `
Home supplies      ₹2,624.75
Home Supplies      ₹2,624.75
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBeGreaterThanOrEqual(1);
            // At least one should have parsed as "Home supplies" or "Home Supplies"
            const hs = result.find((e) => e.category.toLowerCase() === "home supplies");
            expect(hs).toBeDefined();
        });

        it("returns empty array for empty text", () => {
            expect(parseOcrText("", "test.png")).toEqual([]);
            expect(parseOcrText("   \n  \n  ", "test.png")).toEqual([]);
        });

        it("rejects lines where category contains numbers", () => {
            const text = `
January 2026
193 TRANSACTIONS
Investments        ₹2,00,077.00
      `;
            const result = parseOcrText(text, "test.png");
            expect(result.length).toBe(1);
            expect(result[0].category).toBe("Investments");
        });
    });

    describe("isNoiseLine", () => {
        it("rejects time strings", () => {
            expect(isNoiseLine("9:11")).toBe(true);
            expect(isNoiseLine("9:11 AM")).toBe(true);
        });

        it("rejects tab labels", () => {
            expect(isNoiseLine("HEAD CATEGORIES")).toBe(true);
            expect(isNoiseLine("CATEGORIES")).toBe(true);
            expect(isNoiseLine("OVERVIEW")).toBe(true);
            expect(isNoiseLine("SPENDING")).toBe(true);
            expect(isNoiseLine("LIST")).toBe(true);
        });

        it("rejects summary labels", () => {
            expect(isNoiseLine("INCOME")).toBe(true);
            expect(isNoiseLine("EXPENSES")).toBe(true);
            expect(isNoiseLine("LEFT")).toBe(true);
        });

        it("rejects nav bar items", () => {
            expect(isNoiseLine("Overview")).toBe(true);
            expect(isNoiseLine("Budget")).toBe(true);
            expect(isNoiseLine("Wallets")).toBe(true);
            expect(isNoiseLine("Save")).toBe(true);
            expect(isNoiseLine("Tools")).toBe(true);
        });

        it("rejects month headers", () => {
            expect(isNoiseLine("January 2026")).toBe(true);
            expect(isNoiseLine("December 2025")).toBe(true);
        });

        it("rejects Budget Together text", () => {
            expect(isNoiseLine("Budget together")).toBe(true);
            expect(isNoiseLine("Invite budget member")).toBe(true);
        });

        it("rejects transaction count", () => {
            expect(isNoiseLine("193 TRANSACTIONS")).toBe(true);
        });

        it("accepts valid category lines with amounts", () => {
            expect(isNoiseLine("Investments ₹2,00,077.00")).toBe(false);
            expect(isNoiseLine("Home Supplies ₹2,624.75")).toBe(false);
            expect(isNoiseLine("Rapido ₹2,039.00")).toBe(false);
        });

        it("does NOT flag valid category names as noise", () => {
            // "Investments" is a valid category, not noise —
            // the chart center "INVESTMENTS" is filtered out by lack of amount, not by noise detection
            expect(isNoiseLine("Investments")).toBe(false);
            expect(isNoiseLine("INVESTMENTS")).toBe(false);
        });
    });

    describe("isBudgetTogetherEntry", () => {
        it("identifies colon-separated entries", () => {
            expect(isBudgetTogetherEntry("Clothes: ₹170.00")).toBe(true);
            expect(isBudgetTogetherEntry("Electronics: ₹110.00")).toBe(true);
            expect(isBudgetTogetherEntry("Groceries: ₹23.00")).toBe(true);
        });

        it("does not flag normal entries", () => {
            expect(isBudgetTogetherEntry("Investments   ₹2,00,077.00")).toBe(false);
            expect(isBudgetTogetherEntry("Rent  ₹15,000.00")).toBe(false);
        });
    });

    describe("extractAmountFromLine", () => {
        it("extracts amount with ₹ symbol", () => {
            expect(extractAmountFromLine("Rent ₹15,000.00")).toBeCloseTo(15000, 1);
        });

        it("extracts Indian format amount", () => {
            expect(extractAmountFromLine("Investments ₹2,00,077.00")).toBeCloseTo(200077, 1);
        });

        it("extracts amount without ₹", () => {
            expect(extractAmountFromLine("Rent 15,000.00")).toBeCloseTo(15000, 1);
        });

        it("returns NaN for lines without amounts", () => {
            expect(extractAmountFromLine("HEAD CATEGORIES")).toBeNaN();
            expect(extractAmountFromLine("Budget together")).toBeNaN();
        });
    });

    describe("Pattern E — ₹ completely dropped", () => {
        it("extracts Food when ₹ is completely missing", () => {
            const entries = parseOcrText("i Food 9,824.80", "test.png");
            expect(entries.length).toBe(1);
            expect(entries[0].category).toBe("i Food");
            expect(entries[0].amount).toBeCloseTo(9824.8, 1);
        });

        it("extracts Electronics when ₹ is completely missing", () => {
            const entries = parseOcrText("# i Electronics 4,317.00", "test.png");
            expect(entries.length).toBe(1);
            expect(entries[0].category).toBe("i Electronics");
            expect(entries[0].amount).toBeCloseTo(4317, 1);
        });

        it("still uses Pattern D for misread ₹ (e.g. Gym 31,449)", () => {
            const entries = parseOcrText("# Gym 31,449", "test.png");
            expect(entries.length).toBe(1);
            // Pattern D strips the leading 3 (misread ₹)
            expect(entries[0].amount).toBeCloseTo(1449, 1);
        });

        it("still uses Pattern D for misread ₹ (e.g. Investments 32,00,077.00)", () => {
            const entries = parseOcrText("Investments 32,00,077.00", "test.png");
            expect(entries.length).toBe(1);
            expect(entries[0].amount).toBeCloseTo(200077, 1);
        });
    });
});
