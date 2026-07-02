// @vitest-environment node
import { describe, it, expect } from "vitest";
import { exportToCsv, type ExportData } from "@/lib/export/csv";

describe("CSV Export", () => {
    const sampleData: ExportData = {
        expenses: [
            { year: 2026, month: 1, category: "Food", amount: 9824.8 },
            { year: 2026, month: 2, category: "Food", amount: 10200.5 },
            { year: 2026, month: 1, category: "Rent", amount: 15000 },
        ],
    };

    it("generates a valid CSV string", () => {
        const csv = exportToCsv(sampleData);
        expect(typeof csv).toBe("string");
        expect(csv.length).toBeGreaterThan(0);
    });

    it("starts with UTF-8 BOM", () => {
        const csv = exportToCsv(sampleData);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it("has correct header row", () => {
        const csv = exportToCsv(sampleData);
        const lines = csv.split("\n");
        // BOM is part of first line
        expect(lines[0]).toContain("Year");
        expect(lines[0]).toContain("Month");
        expect(lines[0]).toContain("Category");
        expect(lines[0]).toContain("Amount (INR)");
    });

    it("has correct data rows", () => {
        const csv = exportToCsv(sampleData);
        const lines = csv.split("\n").filter((l) => l.trim());
        // Header + 3 data rows
        expect(lines).toHaveLength(4);
    });

    it("formats amounts correctly", () => {
        const csv = exportToCsv(sampleData);
        expect(csv).toContain("9824.80");
        expect(csv).toContain("10200.50");
        expect(csv).toContain("15000.00");
    });

    it("includes month names", () => {
        const csv = exportToCsv(sampleData);
        expect(csv).toContain("January");
        expect(csv).toContain("February");
    });

    it("handles empty data", () => {
        const csv = exportToCsv({ expenses: [] });
        const lines = csv.split("\n").filter((l) => l.trim());
        expect(lines).toHaveLength(1); // Just header
    });

    it("escapes commas in category names", () => {
        const data: ExportData = {
            expenses: [{ year: 2026, month: 1, category: "Home Supplies, General", amount: 2000 }],
        };
        const csv = exportToCsv(data);
        expect(csv).toContain('"Home Supplies, General"');
    });

    it("sorts by year, month, category", () => {
        const data: ExportData = {
            expenses: [
                { year: 2026, month: 2, category: "Rent", amount: 15000 },
                { year: 2025, month: 12, category: "Food", amount: 9000 },
                { year: 2026, month: 1, category: "Gym", amount: 1449 },
            ],
        };
        const csv = exportToCsv(data);
        const lines = csv.split("\n").filter((l) => l.trim());
        // Line 1 = header, line 2 should be 2025
        expect(lines[1]).toContain("2025");
        expect(lines[2]).toContain("2026");
    });
});
