import { describe, it, expect } from "vitest";
import {
    monthNameToNumber,
    monthNumberToName,
    getMonthYearLabel,
    getPreviousMonth,
    getNextMonth,
    isValidMonth,
    isValidYear,
} from "@/lib/utils/dates";

describe("monthNameToNumber", () => {
    it("converts full month names", () => {
        expect(monthNameToNumber("January")).toBe(1);
        expect(monthNameToNumber("February")).toBe(2);
        expect(monthNameToNumber("March")).toBe(3);
        expect(monthNameToNumber("April")).toBe(4);
        expect(monthNameToNumber("May")).toBe(5);
        expect(monthNameToNumber("June")).toBe(6);
        expect(monthNameToNumber("July")).toBe(7);
        expect(monthNameToNumber("August")).toBe(8);
        expect(monthNameToNumber("September")).toBe(9);
        expect(monthNameToNumber("October")).toBe(10);
        expect(monthNameToNumber("November")).toBe(11);
        expect(monthNameToNumber("December")).toBe(12);
    });

    it("is case-insensitive", () => {
        expect(monthNameToNumber("january")).toBe(1);
        expect(monthNameToNumber("DECEMBER")).toBe(12);
        expect(monthNameToNumber("mArCh")).toBe(3);
    });

    it("handles short month names", () => {
        expect(monthNameToNumber("Jan")).toBe(1);
        expect(monthNameToNumber("Feb")).toBe(2);
        expect(monthNameToNumber("Dec")).toBe(12);
    });

    it("returns null for invalid month names", () => {
        expect(monthNameToNumber("Invalid")).toBeNull();
        expect(monthNameToNumber("")).toBeNull();
        expect(monthNameToNumber("Janu")).toBeNull();
    });
});

describe("monthNumberToName", () => {
    it("converts numbers to full month names", () => {
        expect(monthNumberToName(1)).toBe("January");
        expect(monthNumberToName(6)).toBe("June");
        expect(monthNumberToName(12)).toBe("December");
    });

    it("supports short format", () => {
        expect(monthNumberToName(1, "short")).toBe("Jan");
        expect(monthNumberToName(9, "short")).toBe("Sep");
    });

    it("returns null for out-of-range numbers", () => {
        expect(monthNumberToName(0)).toBeNull();
        expect(monthNumberToName(13)).toBeNull();
        expect(monthNumberToName(-1)).toBeNull();
    });
});

describe("getMonthYearLabel", () => {
    it("formats month/year: (1, 2026) → 'January 2026'", () => {
        expect(getMonthYearLabel(1, 2026)).toBe("January 2026");
    });

    it("formats with short month", () => {
        expect(getMonthYearLabel(12, 2024, "short")).toBe("Dec 2024");
    });
});

describe("getPreviousMonth", () => {
    it("returns previous month in same year", () => {
        expect(getPreviousMonth(6, 2026)).toEqual({ month: 5, year: 2026 });
    });

    it("wraps around to December of previous year", () => {
        expect(getPreviousMonth(1, 2026)).toEqual({ month: 12, year: 2025 });
    });
});

describe("getNextMonth", () => {
    it("returns next month in same year", () => {
        expect(getNextMonth(6, 2026)).toEqual({ month: 7, year: 2026 });
    });

    it("wraps around to January of next year", () => {
        expect(getNextMonth(12, 2025)).toEqual({ month: 1, year: 2026 });
    });
});

describe("isValidMonth", () => {
    it("accepts 1-12", () => {
        for (let m = 1; m <= 12; m++) {
            expect(isValidMonth(m)).toBe(true);
        }
    });

    it("rejects out of range", () => {
        expect(isValidMonth(0)).toBe(false);
        expect(isValidMonth(13)).toBe(false);
        expect(isValidMonth(-1)).toBe(false);
    });
});

describe("isValidYear", () => {
    it("accepts reasonable years", () => {
        expect(isValidYear(2024)).toBe(true);
        expect(isValidYear(2030)).toBe(true);
    });

    it("rejects unreasonable years", () => {
        expect(isValidYear(1899)).toBe(false);
        expect(isValidYear(2101)).toBe(false);
    });
});
