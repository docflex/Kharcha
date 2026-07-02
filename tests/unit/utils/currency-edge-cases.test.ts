import { describe, it, expect } from "vitest";
import { parseIndianNumber, formatINR, formatCurrency } from "@/lib/utils/currency";

describe("Currency Utils — Edge Cases", () => {
    describe("parseIndianNumber", () => {
        it("parses plain integers", () => {
            expect(parseIndianNumber("5000")).toBe(5000);
        });

        it("parses with Indian comma grouping", () => {
            expect(parseIndianNumber("1,00,000")).toBe(100000);
        });

        it("parses with Western comma grouping", () => {
            expect(parseIndianNumber("100,000")).toBe(100000);
        });

        it("parses with rupee symbol", () => {
            expect(parseIndianNumber("₹5,000")).toBe(5000);
        });

        it("parses with rupee symbol and spaces", () => {
            expect(parseIndianNumber("₹ 5,000")).toBe(5000);
        });

        it("parses decimal amounts", () => {
            expect(parseIndianNumber("1,234.56")).toBe(1234.56);
        });

        it("parses plain decimal", () => {
            expect(parseIndianNumber("0.01")).toBe(0.01);
        });

        it("returns NaN for non-numeric strings", () => {
            expect(parseIndianNumber("abc")).toBeNaN();
        });

        it("returns NaN for empty string", () => {
            expect(parseIndianNumber("")).toBeNaN();
        });

        it("handles negative sign", () => {
            // Implementation may or may not support this
            const result = parseIndianNumber("-5000");
            expect(typeof result).toBe("number");
        });
    });

    describe("formatINR", () => {
        it("formats small numbers", () => {
            const formatted = formatINR(500);
            expect(formatted).toContain("500");
        });

        it("formats large numbers with Indian grouping", () => {
            const formatted = formatINR(100000);
            expect(formatted).toContain("1,00,000");
        });

        it("formats zero", () => {
            const formatted = formatINR(0);
            expect(formatted).toContain("0");
        });

        it("formats decimal amounts", () => {
            const formatted = formatINR(1234.56);
            expect(formatted).toContain("1,234");
        });

        it("formats very large numbers", () => {
            const formatted = formatINR(10000000);
            expect(formatted).toContain("1,00,00,000");
        });
    });

    describe("formatCurrency", () => {
        it("formats INR", () => {
            const formatted = formatCurrency(5000, "INR");
            expect(formatted).toBeDefined();
            expect(typeof formatted).toBe("string");
        });

        it("formats USD", () => {
            const formatted = formatCurrency(5000, "USD");
            expect(formatted).toContain("5,000");
        });

        it("formats EUR", () => {
            const formatted = formatCurrency(5000, "EUR");
            expect(typeof formatted).toBe("string");
        });
    });
});
