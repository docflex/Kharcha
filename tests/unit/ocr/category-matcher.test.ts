// @vitest-environment node
import { describe, it, expect } from "vitest";
import { normalizeCategory, matchCategory, CATEGORY_ALIASES } from "@/lib/ocr/category-matcher";

describe("Category Matcher", () => {
    describe("normalizeCategory", () => {
        it("trims whitespace", () => {
            expect(normalizeCategory("  Rent  ")).toBe("Rent");
        });

        it("applies title case", () => {
            expect(normalizeCategory("home supplies")).toBe("Home Supplies");
            expect(normalizeCategory("INVESTMENTS")).toBe("Investments");
        });

        it("resolves known aliases", () => {
            expect(normalizeCategory("Service")).toBe("Services");
            expect(normalizeCategory("service")).toBe("Services");
            expect(normalizeCategory("Home supply")).toBe("Home Supplies");
            expect(normalizeCategory("home supply")).toBe("Home Supplies");
        });

        it("preserves already-correct names", () => {
            expect(normalizeCategory("Investments")).toBe("Investments");
            expect(normalizeCategory("Rent")).toBe("Rent");
            expect(normalizeCategory("Home Supplies")).toBe("Home Supplies");
            expect(normalizeCategory("Services")).toBe("Services");
        });

        it("handles OCR artifacts (extra spaces inside)", () => {
            expect(normalizeCategory("Home  supplies")).toBe("Home Supplies");
            expect(normalizeCategory("Home   Supplies")).toBe("Home Supplies");
        });

        it("strips leading non-alpha characters", () => {
            expect(normalizeCategory("@ Rent")).toBe("Rent");
            expect(normalizeCategory("🟨 Food")).toBe("Food");
            expect(normalizeCategory("• Groceries")).toBe("Groceries");
        });

        it("returns empty string for empty input", () => {
            expect(normalizeCategory("")).toBe("");
            expect(normalizeCategory("   ")).toBe("");
        });
    });

    describe("matchCategory", () => {
        const knownCategories = [
            "Investments",
            "Rent",
            "Food",
            "Groceries",
            "Shopping",
            "Electronics",
            "Home Supplies",
            "Services",
            "Rapido",
            "Entertainment",
            "Taxi",
            "Doctor",
            "Cinema",
            "Electricity",
            "Flight",
            "Gift",
            "Gym",
            "Hotel",
            "Laundry",
            "Bank",
            "Miscellaneous",
            "Telephone",
        ];

        it("matches exact names", () => {
            const result = matchCategory("Rent", knownCategories);
            expect(result.category).toBe("Rent");
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        });

        it("matches case-insensitive", () => {
            const result = matchCategory("rent", knownCategories);
            expect(result.category).toBe("Rent");
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        });

        it("resolves aliases to canonical names", () => {
            const result = matchCategory("Service", knownCategories);
            expect(result.category).toBe("Services");
            expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        });

        it("matches 'Home supplies' (case variation) to 'Home Supplies'", () => {
            const result = matchCategory("Home supplies", knownCategories);
            expect(result.category).toBe("Home Supplies");
        });

        it("matches fuzzy similar names", () => {
            const result = matchCategory("Electricty", knownCategories); // typo
            expect(result.category).toBe("Electricity");
            expect(result.confidence).toBeGreaterThan(0.5);
        });

        it("returns the input when no match found", () => {
            const result = matchCategory("SomeRandomCategory", knownCategories);
            expect(result.category).toBe("Somerandomcategory");
            expect(result.confidence).toBeLessThan(0.5);
        });

        it("handles empty known categories gracefully", () => {
            const result = matchCategory("Rent", []);
            expect(result.category).toBe("Rent");
        });
    });

    describe("CATEGORY_ALIASES", () => {
        it("contains Service -> Services mapping", () => {
            expect(CATEGORY_ALIASES["service"]).toBe("Services");
        });

        it("contains Home supply -> Home Supplies mapping", () => {
            expect(CATEGORY_ALIASES["home supply"]).toBe("Home Supplies");
        });

        it("contains Home supplies -> Home Supplies mapping", () => {
            expect(CATEGORY_ALIASES["home supplies"]).toBe("Home Supplies");
        });
    });
});
