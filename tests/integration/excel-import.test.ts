import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import { parseExcelBuffer, importExcelData, type ParsedExcelRow } from "@/lib/import/excel";
import ExcelJS from "exceljs";

/**
 * Helper to create a mock Spending Tracker workbook matching the real format:
 * Sheet "Monthly Input", columns D-G (1-indexed: 4-7), data starts row 3.
 * Schema: Year | Month | Category | Amount
 */
async function createMockWorkbook(
    rows: { year: number; month: string; category: string; amount: number }[]
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Input");

    // Row 1-2: headers / empty (data starts row 3)
    sheet.getCell("D1").value = "Year";
    sheet.getCell("E1").value = "Month";
    sheet.getCell("F1").value = "Category";
    sheet.getCell("G1").value = "Amount";
    // Row 2 is empty (matches real file structure)
    sheet.getRow(2);

    rows.forEach((row, i) => {
        const rowNum = i + 3; // data starts at row 3
        sheet.getCell(`D${rowNum}`).value = row.year;
        sheet.getCell(`E${rowNum}`).value = row.month;
        sheet.getCell(`F${rowNum}`).value = row.category;
        sheet.getCell(`G${rowNum}`).value = row.amount;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("Excel Import — parseExcelBuffer", () => {
    it("parses valid rows from a workbook buffer", async () => {
        const buf = await createMockWorkbook([
            { year: 2024, month: "January", category: "Food", amount: 9824.8 },
            { year: 2024, month: "January", category: "Rent", amount: 15000 },
            { year: 2024, month: "February", category: "Food", amount: 8500 },
        ]);

        const result = await parseExcelBuffer(buf);
        expect(result.rows).toHaveLength(3);
        expect(result.errors).toHaveLength(0);

        expect(result.rows[0]).toEqual({
            year: 2024,
            month: 1,
            category: "Food",
            amount: 9824.8,
            rawMonth: "January",
        });
    });

    it("handles all 12 months", async () => {
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        const buf = await createMockWorkbook(
            months.map((m, i) => ({
                year: 2025,
                month: m,
                category: "Food",
                amount: 1000 * (i + 1),
            }))
        );

        const result = await parseExcelBuffer(buf);
        expect(result.rows).toHaveLength(12);
        result.rows.forEach((row, i) => {
            expect(row.month).toBe(i + 1);
        });
    });

    it("reports errors for invalid month names", async () => {
        const buf = await createMockWorkbook([
            { year: 2024, month: "Janaury", category: "Food", amount: 100 },
        ]);

        const result = await parseExcelBuffer(buf);
        expect(result.rows).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("Row 3");
        expect(result.errors[0]).toContain("month");
    });

    it("reports errors for negative amounts", async () => {
        const buf = await createMockWorkbook([
            { year: 2024, month: "January", category: "Food", amount: -500 },
        ]);

        const result = await parseExcelBuffer(buf);
        expect(result.rows).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("amount");
    });

    it("skips completely empty rows", async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Monthly Input");
        sheet.getCell("D1").value = "Year";
        sheet.getCell("E1").value = "Month";
        sheet.getCell("F1").value = "Category";
        sheet.getCell("G1").value = "Amount";
        // Row 3: valid
        sheet.getCell("D3").value = 2024;
        sheet.getCell("E3").value = "January";
        sheet.getCell("F3").value = "Food";
        sheet.getCell("G3").value = 100;
        // Row 4: empty
        // Row 5: valid
        sheet.getCell("D5").value = 2024;
        sheet.getCell("E5").value = "February";
        sheet.getCell("F5").value = "Rent";
        sheet.getCell("G5").value = 15000;

        const buf = Buffer.from(await workbook.xlsx.writeBuffer());
        const result = await parseExcelBuffer(buf);
        expect(result.rows).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
    });

    it("returns unique categories found", async () => {
        const buf = await createMockWorkbook([
            { year: 2024, month: "January", category: "Food", amount: 100 },
            { year: 2024, month: "January", category: "Rent", amount: 200 },
            { year: 2024, month: "February", category: "Food", amount: 300 },
        ]);

        const result = await parseExcelBuffer(buf);
        expect(result.categories).toEqual(expect.arrayContaining(["Food", "Rent"]));
        expect(result.categories).toHaveLength(2);
    });

    it("returns summary stats", async () => {
        const buf = await createMockWorkbook([
            { year: 2024, month: "January", category: "Food", amount: 100 },
            { year: 2024, month: "March", category: "Rent", amount: 200 },
            { year: 2025, month: "June", category: "Food", amount: 300 },
        ]);

        const result = await parseExcelBuffer(buf);
        expect(result.summary.totalRows).toBe(3);
        expect(result.summary.totalAmount).toBeCloseTo(600);
        expect(result.summary.dateRange.startYear).toBe(2024);
        expect(result.summary.dateRange.endYear).toBe(2025);
    });
});

describe("Excel Import — importExcelData", () => {
    let db: Awaited<ReturnType<typeof createTestDb>>["db"];
    let cleanup: () => Promise<void>;
    let userId: string;
    let foodCatId: string;
    let rentCatId: string;

    beforeEach(async () => {
        const testDb = await createTestDb();
        db = testDb.db;
        cleanup = testDb.cleanup;
        userId = await seedTestUser(db);
        foodCatId = await seedTestCategory(db, userId, { name: "Food" });
        rentCatId = await seedTestCategory(db, userId, { name: "Rent" });
    });

    afterEach(async () => await cleanup());

    it("imports parsed rows as expenses with source=import", async () => {
        const rows: ParsedExcelRow[] = [
            { year: 2024, month: 1, category: "Food", amount: 9824.8, rawMonth: "January" },
            { year: 2024, month: 1, category: "Rent", amount: 15000, rawMonth: "January" },
        ];

        const categoryMap = { Food: foodCatId, Rent: rentCatId };
        const result = await importExcelData(db, userId, rows, categoryMap);

        expect(result.imported).toBe(2);
        expect(result.skipped).toBe(0);
        expect(result.errors).toHaveLength(0);
    });

    it("skips rows with unmapped categories", async () => {
        const rows: ParsedExcelRow[] = [
            { year: 2024, month: 1, category: "Food", amount: 100, rawMonth: "January" },
            { year: 2024, month: 1, category: "Unknown", amount: 200, rawMonth: "January" },
        ];

        const categoryMap = { Food: foodCatId };
        const result = await importExcelData(db, userId, rows, categoryMap);

        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.errors[0]).toContain("Unknown");
    });

    it("handles duplicate imports gracefully", async () => {
        const rows: ParsedExcelRow[] = [
            { year: 2024, month: 1, category: "Food", amount: 100, rawMonth: "January" },
        ];
        const categoryMap = { Food: foodCatId };

        // Import twice
        await importExcelData(db, userId, rows, categoryMap);
        const result = await importExcelData(db, userId, rows, categoryMap);

        // Second import should still succeed (creates new records — dedup is review-layer concern)
        expect(result.imported).toBe(1);
    });
});
