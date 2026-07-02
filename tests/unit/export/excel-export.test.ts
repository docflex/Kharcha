// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";
import * as schema from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { exportToExcel, type ExportData } from "@/lib/export/excel";
import ExcelJS from "exceljs";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let userId: string;
let foodCatId: string;
let rentCatId: string;

beforeAll(async () => {
    testDb = await createTestDb();
    userId = await seedTestUser(testDb.db);
    foodCatId = await seedTestCategory(testDb.db, userId, { name: "Food" });
    rentCatId = await seedTestCategory(testDb.db, userId, { name: "Rent" });

    // Seed some expenses
    const expenses = [
        { catId: foodCatId, year: 2026, month: 1, amount: 9824.8 },
        { catId: foodCatId, year: 2026, month: 2, amount: 10200.5 },
        { catId: rentCatId, year: 2026, month: 1, amount: 15000 },
        { catId: rentCatId, year: 2026, month: 2, amount: 15000 },
    ];
    for (const exp of expenses) {
        await testDb.db.insert(schema.expenses).values({
            id: uuid(),
            userId,
            categoryId: exp.catId,
            year: exp.year,
            month: exp.month,
            amount: exp.amount,
            source: "manual",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
});

afterAll(async () => await testDb.cleanup());

describe("Excel Export", () => {
    it("generates a valid Excel buffer", async () => {
        const data: ExportData = {
            expenses: [
                { year: 2026, month: 1, category: "Food", amount: 9824.8 },
                { year: 2026, month: 2, category: "Food", amount: 10200.5 },
                { year: 2026, month: 1, category: "Rent", amount: 15000 },
                { year: 2026, month: 2, category: "Rent", amount: 15000 },
            ],
        };

        const buffer = await exportToExcel(data);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
    });

    it("has a Monthly Input sheet with correct columns", async () => {
        const data: ExportData = {
            expenses: [{ year: 2026, month: 1, category: "Food", amount: 9824.8 }],
        };

        const buffer = await exportToExcel(data);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.getWorksheet("Monthly Input");
        expect(sheet).toBeDefined();

        // Check header row
        const headerRow = sheet!.getRow(1);
        expect(headerRow.getCell(1).value).toBe("Year");
        expect(headerRow.getCell(2).value).toBe("Month");
        expect(headerRow.getCell(3).value).toBe("Category");
        expect(headerRow.getCell(4).value).toBe("Amount");
    });

    it("contains all expense rows", async () => {
        const data: ExportData = {
            expenses: [
                { year: 2026, month: 1, category: "Food", amount: 9824.8 },
                { year: 2026, month: 2, category: "Rent", amount: 15000 },
            ],
        };

        const buffer = await exportToExcel(data);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.getWorksheet("Monthly Input")!;
        // Row 1 = header, rows 2-3 = data
        expect(sheet.getRow(2).getCell(1).value).toBe(2026);
        expect(sheet.getRow(2).getCell(3).value).toBe("Food");
        expect(sheet.getRow(2).getCell(4).value).toBe(9824.8);
        expect(sheet.getRow(3).getCell(3).value).toBe("Rent");
    });

    it("has a Summary sheet with pivot-style data", async () => {
        const data: ExportData = {
            expenses: [
                { year: 2026, month: 1, category: "Food", amount: 9824.8 },
                { year: 2026, month: 2, category: "Food", amount: 10200.5 },
                { year: 2026, month: 1, category: "Rent", amount: 15000 },
                { year: 2026, month: 2, category: "Rent", amount: 15000 },
            ],
        };

        const buffer = await exportToExcel(data);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const summary = workbook.getWorksheet("Summary");
        expect(summary).toBeDefined();
        // Should have header row with months as columns
        expect(summary!.getRow(1).getCell(1).value).toBe("Category");
    });

    it("handles empty data gracefully", async () => {
        const data: ExportData = { expenses: [] };
        const buffer = await exportToExcel(data);
        expect(buffer).toBeInstanceOf(Buffer);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.getWorksheet("Monthly Input");
        expect(sheet).toBeDefined();
    });

    it("sorts expenses by year, month, category", async () => {
        const data: ExportData = {
            expenses: [
                { year: 2026, month: 2, category: "Rent", amount: 15000 },
                { year: 2026, month: 1, category: "Food", amount: 9824.8 },
                { year: 2025, month: 12, category: "Gym", amount: 1449 },
            ],
        };

        const buffer = await exportToExcel(data);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.getWorksheet("Monthly Input")!;
        // Should be sorted: 2025/12, 2026/1, 2026/2
        expect(sheet.getRow(2).getCell(1).value).toBe(2025);
        expect(sheet.getRow(3).getCell(1).value).toBe(2026);
        expect(sheet.getRow(3).getCell(2).value).toBe(1);
    });
});
