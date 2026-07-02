import { describe, it, expect } from "vitest";
import { parseIndianNumber, formatINR, formatCurrency } from "@/lib/utils/currency";

describe("parseIndianNumber", () => {
    it("parses lakhs format: 2,00,077.00 → 200077", () => {
        expect(parseIndianNumber("2,00,077.00")).toBe(200077.0);
    });

    it("parses lakhs format: 1,18,000.00 → 118000", () => {
        expect(parseIndianNumber("1,18,000.00")).toBe(118000.0);
    });

    it("parses lakhs format: 1,05,012.00 → 105012", () => {
        expect(parseIndianNumber("1,05,012.00")).toBe(105012.0);
    });

    it("parses lakhs format: 2,99,301.32 → 299301.32", () => {
        expect(parseIndianNumber("2,99,301.32")).toBe(299301.32);
    });

    it("parses thousands format: 15,000.00 → 15000", () => {
        expect(parseIndianNumber("15,000.00")).toBe(15000.0);
    });

    it("parses thousands format: 9,824.80 → 9824.80", () => {
        expect(parseIndianNumber("9,824.80")).toBe(9824.8);
    });

    it("parses hundreds format: 835.80 → 835.80", () => {
        expect(parseIndianNumber("835.80")).toBe(835.8);
    });

    it("parses tens format: 72.00 → 72", () => {
        expect(parseIndianNumber("72.00")).toBe(72.0);
    });

    it("parses without decimal: 15,000 → 15000", () => {
        expect(parseIndianNumber("15,000")).toBe(15000.0);
    });

    it("parses plain integer: 835 → 835", () => {
        expect(parseIndianNumber("835")).toBe(835.0);
    });

    it("strips ₹ symbol: ₹15,000.00 → 15000", () => {
        expect(parseIndianNumber("₹15,000.00")).toBe(15000.0);
    });

    it("strips ₹ with space: ₹ 2,00,077.00 → 200077", () => {
        expect(parseIndianNumber("₹ 2,00,077.00")).toBe(200077.0);
    });

    it("handles whitespace around value", () => {
        expect(parseIndianNumber("  9,824.80  ")).toBe(9824.8);
    });

    it("returns NaN for empty string", () => {
        expect(parseIndianNumber("")).toBeNaN();
    });

    it("returns NaN for non-numeric text", () => {
        expect(parseIndianNumber("abc")).toBeNaN();
    });

    it("returns NaN for null-like inputs", () => {
        expect(parseIndianNumber(null as unknown as string)).toBeNaN();
        expect(parseIndianNumber(undefined as unknown as string)).toBeNaN();
    });

    it("parses international format too: 200,077.00 → 200077", () => {
        expect(parseIndianNumber("200,077.00")).toBe(200077.0);
    });

    it("handles single decimal place: 1,770.0 → 1770", () => {
        expect(parseIndianNumber("1,770.0")).toBe(1770.0);
    });
});

describe("formatINR", () => {
    it("formats with Indian comma grouping: 200077 → ₹2,00,077.00", () => {
        expect(formatINR(200077)).toBe("₹2,00,077.00");
    });

    it("formats thousands: 15000 → ₹15,000.00", () => {
        expect(formatINR(15000)).toBe("₹15,000.00");
    });

    it("formats with paise: 9824.80 → ₹9,824.80", () => {
        expect(formatINR(9824.8)).toBe("₹9,824.80");
    });

    it("formats small amounts: 72 → ₹72.00", () => {
        expect(formatINR(72)).toBe("₹72.00");
    });

    it("formats zero: 0 → ₹0.00", () => {
        expect(formatINR(0)).toBe("₹0.00");
    });

    it("formats lakhs: 118000 → ₹1,18,000.00", () => {
        expect(formatINR(118000)).toBe("₹1,18,000.00");
    });

    it("formats crores: 10000000 → ₹1,00,00,000.00", () => {
        expect(formatINR(10000000)).toBe("₹1,00,00,000.00");
    });
});

describe("formatCurrency", () => {
    it("formats USD amounts", () => {
        expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    });

    it("formats EUR amounts", () => {
        expect(formatCurrency(1234.56, "EUR")).toMatch(/€/);
    });

    it("formats INR amounts with Indian grouping", () => {
        expect(formatCurrency(200077, "INR")).toBe("₹2,00,077.00");
    });

    it("formats GBP amounts", () => {
        expect(formatCurrency(1234.56, "GBP")).toMatch(/£/);
    });
});
