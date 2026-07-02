import { describe, it, expect } from "vitest";
import {
    createCategorySchema,
    createExpenseSchema,
    createBudgetSchema,
    createIncomeSchema,
    registerSchema,
    loginSchema,
    updateExpenseSchema,
    updateCategorySchema,
    updateBudgetSchema,
    updateIncomeSchema,
    bulkDeleteExpensesSchema,
    bulkUpdateExpensesSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changePasswordSchema,
} from "@/lib/utils/validators";

describe("Validators — Zod Schemas", () => {
    describe("createCategorySchema", () => {
        it("accepts valid category", () => {
            const result = createCategorySchema.safeParse({ name: "Food" });
            expect(result.success).toBe(true);
        });

        it("defaults type to expense", () => {
            const result = createCategorySchema.parse({ name: "Food" });
            expect(result.type).toBe("expense");
        });

        it("accepts investment type", () => {
            const result = createCategorySchema.parse({ name: "Stocks", type: "investment" });
            expect(result.type).toBe("investment");
        });

        it("rejects empty name", () => {
            const result = createCategorySchema.safeParse({ name: "" });
            expect(result.success).toBe(false);
        });

        it("rejects name over 50 chars", () => {
            const result = createCategorySchema.safeParse({ name: "a".repeat(51) });
            expect(result.success).toBe(false);
        });

        it("accepts valid hex color", () => {
            const result = createCategorySchema.safeParse({ name: "Food", color: "#FF5733" });
            expect(result.success).toBe(true);
        });

        it("rejects invalid hex color", () => {
            const result = createCategorySchema.safeParse({ name: "Food", color: "#GGG" });
            expect(result.success).toBe(false);
        });

        it("rejects invalid type", () => {
            const result = createCategorySchema.safeParse({ name: "Food", type: "savings" });
            expect(result.success).toBe(false);
        });
    });

    describe("createExpenseSchema", () => {
        const valid = {
            categoryId: "cat-123",
            year: 2026,
            month: 1,
            amount: 500,
        };

        it("accepts valid expense", () => {
            const result = createExpenseSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it("defaults source to manual", () => {
            const parsed = createExpenseSchema.parse(valid);
            expect(parsed.source).toBe("manual");
        });

        it("rejects negative amount", () => {
            const result = createExpenseSchema.safeParse({ ...valid, amount: -100 });
            expect(result.success).toBe(false);
        });

        it("rejects zero amount", () => {
            const result = createExpenseSchema.safeParse({ ...valid, amount: 0 });
            expect(result.success).toBe(false);
        });

        it("rejects month 0", () => {
            const result = createExpenseSchema.safeParse({ ...valid, month: 0 });
            expect(result.success).toBe(false);
        });

        it("rejects month 13", () => {
            const result = createExpenseSchema.safeParse({ ...valid, month: 13 });
            expect(result.success).toBe(false);
        });

        it("rejects year below 2000", () => {
            const result = createExpenseSchema.safeParse({ ...valid, year: 1999 });
            expect(result.success).toBe(false);
        });

        it("rejects year above 2100", () => {
            const result = createExpenseSchema.safeParse({ ...valid, year: 2101 });
            expect(result.success).toBe(false);
        });

        it("accepts confidence between 0 and 1", () => {
            const result = createExpenseSchema.safeParse({ ...valid, confidence: 0.85 });
            expect(result.success).toBe(true);
        });

        it("rejects confidence above 1", () => {
            const result = createExpenseSchema.safeParse({ ...valid, confidence: 1.5 });
            expect(result.success).toBe(false);
        });

        it("rejects confidence below 0", () => {
            const result = createExpenseSchema.safeParse({ ...valid, confidence: -0.1 });
            expect(result.success).toBe(false);
        });

        it("accepts notes up to 500 chars", () => {
            const result = createExpenseSchema.safeParse({
                ...valid,
                notes: "a".repeat(500),
            });
            expect(result.success).toBe(true);
        });

        it("rejects notes over 500 chars", () => {
            const result = createExpenseSchema.safeParse({
                ...valid,
                notes: "a".repeat(501),
            });
            expect(result.success).toBe(false);
        });

        it("rejects invalid source", () => {
            const result = createExpenseSchema.safeParse({ ...valid, source: "api" });
            expect(result.success).toBe(false);
        });

        it("accepts ocr and import sources", () => {
            expect(createExpenseSchema.safeParse({ ...valid, source: "ocr" }).success).toBe(true);
            expect(createExpenseSchema.safeParse({ ...valid, source: "import" }).success).toBe(
                true
            );
        });

        it("rejects missing categoryId", () => {
            const { categoryId: _categoryId, ...rest } = valid;
            const result = createExpenseSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });

    describe("updateExpenseSchema", () => {
        it("accepts partial update with just amount", () => {
            const result = updateExpenseSchema.safeParse({ amount: 999 });
            expect(result.success).toBe(true);
        });

        it("accepts empty object (no fields to update)", () => {
            const result = updateExpenseSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it("still validates constraints on provided fields", () => {
            const result = updateExpenseSchema.safeParse({ amount: -1 });
            expect(result.success).toBe(false);
        });
    });

    describe("createBudgetSchema", () => {
        const valid = {
            categoryId: "cat-123",
            monthlyLimit: 5000,
            effectiveFrom: "2026-01",
        };

        it("accepts valid budget", () => {
            const result = createBudgetSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it("rejects zero monthlyLimit", () => {
            const result = createBudgetSchema.safeParse({ ...valid, monthlyLimit: 0 });
            expect(result.success).toBe(false);
        });

        it("rejects negative monthlyLimit", () => {
            const result = createBudgetSchema.safeParse({ ...valid, monthlyLimit: -100 });
            expect(result.success).toBe(false);
        });

        it("rejects invalid effectiveFrom format", () => {
            const result = createBudgetSchema.safeParse({
                ...valid,
                effectiveFrom: "2026-1",
            });
            expect(result.success).toBe(false);
        });

        it("rejects effectiveFrom without dash", () => {
            const result = createBudgetSchema.safeParse({
                ...valid,
                effectiveFrom: "202601",
            });
            expect(result.success).toBe(false);
        });

        it("accepts valid effectiveUntil", () => {
            const result = createBudgetSchema.safeParse({
                ...valid,
                effectiveUntil: "2026-12",
            });
            expect(result.success).toBe(true);
        });

        it("rejects invalid effectiveUntil format", () => {
            const result = createBudgetSchema.safeParse({
                ...valid,
                effectiveUntil: "Dec 2026",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("createIncomeSchema", () => {
        it("accepts valid income", () => {
            const result = createIncomeSchema.safeParse({
                year: 2026,
                month: 1,
                amount: 90000,
            });
            expect(result.success).toBe(true);
        });

        it("rejects zero amount", () => {
            const result = createIncomeSchema.safeParse({
                year: 2026,
                month: 1,
                amount: 0,
            });
            expect(result.success).toBe(false);
        });

        it("accepts source field", () => {
            const result = createIncomeSchema.safeParse({
                year: 2026,
                month: 1,
                amount: 90000,
                source: "salary",
            });
            expect(result.success).toBe(true);
        });

        it("rejects source over 100 chars", () => {
            const result = createIncomeSchema.safeParse({
                year: 2026,
                month: 1,
                amount: 90000,
                source: "a".repeat(101),
            });
            expect(result.success).toBe(false);
        });
    });

    describe("registerSchema", () => {
        it("accepts valid registration", () => {
            const result = registerSchema.safeParse({
                name: "Test User",
                email: "test@example.com",
                password: "SecureP@ss1",
            });
            expect(result.success).toBe(true);
        });

        it("rejects empty name", () => {
            const result = registerSchema.safeParse({
                name: "",
                email: "test@example.com",
                password: "SecureP@ss1",
            });
            expect(result.success).toBe(false);
        });

        it("rejects invalid email", () => {
            const result = registerSchema.safeParse({
                name: "Test",
                email: "not-an-email",
                password: "SecureP@ss1",
            });
            expect(result.success).toBe(false);
        });

        it("rejects password under 8 chars", () => {
            const result = registerSchema.safeParse({
                name: "Test",
                email: "test@example.com",
                password: "short",
            });
            expect(result.success).toBe(false);
        });

        it("rejects password over 128 chars", () => {
            const result = registerSchema.safeParse({
                name: "Test",
                email: "test@example.com",
                password: "a".repeat(129),
            });
            expect(result.success).toBe(false);
        });
    });

    describe("loginSchema", () => {
        it("accepts valid login", () => {
            const result = loginSchema.safeParse({
                email: "test@example.com",
                password: "anypassword",
            });
            expect(result.success).toBe(true);
        });

        it("rejects empty password", () => {
            const result = loginSchema.safeParse({
                email: "test@example.com",
                password: "",
            });
            expect(result.success).toBe(false);
        });

        it("rejects invalid email", () => {
            const result = loginSchema.safeParse({
                email: "invalid",
                password: "password123",
            });
            expect(result.success).toBe(false);
        });
    });

    // ─── Missing Schema Tests (Wave 1) ──────────────────────────────────

    describe("updateCategorySchema", () => {
        it("accepts partial update with just name", () => {
            const result = updateCategorySchema.safeParse({ name: "Food & Dining" });
            expect(result.success).toBe(true);
        });

        it("accepts empty object (no fields)", () => {
            const result = updateCategorySchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it("still validates constraints on provided fields", () => {
            const result = updateCategorySchema.safeParse({ name: "" });
            expect(result.success).toBe(false);
        });

        it("rejects invalid color format", () => {
            const result = updateCategorySchema.safeParse({ color: "red" });
            expect(result.success).toBe(false);
        });
    });

    describe("updateBudgetSchema", () => {
        it("accepts partial update with just monthlyLimit", () => {
            const result = updateBudgetSchema.safeParse({ monthlyLimit: 10000 });
            expect(result.success).toBe(true);
        });

        it("accepts empty object", () => {
            const result = updateBudgetSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it("rejects negative monthlyLimit", () => {
            const result = updateBudgetSchema.safeParse({ monthlyLimit: -1 });
            expect(result.success).toBe(false);
        });

        it("rejects invalid effectiveFrom format", () => {
            const result = updateBudgetSchema.safeParse({ effectiveFrom: "Jan 2026" });
            expect(result.success).toBe(false);
        });
    });

    describe("updateIncomeSchema", () => {
        it("accepts partial update with just amount", () => {
            const result = updateIncomeSchema.safeParse({ amount: 150000 });
            expect(result.success).toBe(true);
        });

        it("accepts empty object", () => {
            const result = updateIncomeSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it("rejects zero amount", () => {
            const result = updateIncomeSchema.safeParse({ amount: 0 });
            expect(result.success).toBe(false);
        });
    });

    describe("bulkDeleteExpensesSchema", () => {
        it("accepts valid array of IDs", () => {
            const result = bulkDeleteExpensesSchema.safeParse({
                ids: ["id-1", "id-2", "id-3"],
            });
            expect(result.success).toBe(true);
        });

        it("rejects empty array", () => {
            const result = bulkDeleteExpensesSchema.safeParse({ ids: [] });
            expect(result.success).toBe(false);
        });

        it("rejects missing ids field", () => {
            const result = bulkDeleteExpensesSchema.safeParse({});
            expect(result.success).toBe(false);
        });

        it("rejects array over 500 items", () => {
            const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
            const result = bulkDeleteExpensesSchema.safeParse({ ids });
            expect(result.success).toBe(false);
        });
    });

    describe("bulkUpdateExpensesSchema", () => {
        it("accepts valid IDs and categoryId", () => {
            const result = bulkUpdateExpensesSchema.safeParse({
                ids: ["id-1", "id-2"],
                categoryId: "cat-123",
            });
            expect(result.success).toBe(true);
        });

        it("rejects empty ids array", () => {
            const result = bulkUpdateExpensesSchema.safeParse({
                ids: [],
                categoryId: "cat-123",
            });
            expect(result.success).toBe(false);
        });

        it("rejects missing categoryId", () => {
            const result = bulkUpdateExpensesSchema.safeParse({
                ids: ["id-1"],
            });
            expect(result.success).toBe(false);
        });

        it("rejects empty categoryId", () => {
            const result = bulkUpdateExpensesSchema.safeParse({
                ids: ["id-1"],
                categoryId: "",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("forgotPasswordSchema", () => {
        it("accepts valid email", () => {
            const result = forgotPasswordSchema.safeParse({
                email: "user@example.com",
            });
            expect(result.success).toBe(true);
        });

        it("rejects invalid email", () => {
            const result = forgotPasswordSchema.safeParse({
                email: "not-email",
            });
            expect(result.success).toBe(false);
        });

        it("rejects missing email", () => {
            const result = forgotPasswordSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe("resetPasswordSchema", () => {
        it("accepts valid token and strong password", () => {
            const result = resetPasswordSchema.safeParse({
                token: "abc123def456",
                password: "NewSecure@1",
            });
            expect(result.success).toBe(true);
        });

        it("rejects empty token", () => {
            const result = resetPasswordSchema.safeParse({
                token: "",
                password: "NewSecure@1",
            });
            expect(result.success).toBe(false);
        });

        it("rejects weak password (no uppercase)", () => {
            const result = resetPasswordSchema.safeParse({
                token: "abc123",
                password: "weakpass@1",
            });
            expect(result.success).toBe(false);
        });

        it("rejects weak password (no special char)", () => {
            const result = resetPasswordSchema.safeParse({
                token: "abc123",
                password: "WeakPass1",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("updateProfileSchema", () => {
        it("accepts valid name update", () => {
            const result = updateProfileSchema.safeParse({ name: "New Name" });
            expect(result.success).toBe(true);
        });

        it("accepts preferredCurrency update", () => {
            const result = updateProfileSchema.safeParse({ preferredCurrency: "USD" });
            expect(result.success).toBe(true);
        });

        it("accepts defaultMonthlyIncome update", () => {
            const result = updateProfileSchema.safeParse({ defaultMonthlyIncome: 150000 });
            expect(result.success).toBe(true);
        });

        it("rejects empty name", () => {
            const result = updateProfileSchema.safeParse({ name: "" });
            expect(result.success).toBe(false);
        });

        it("rejects negative defaultMonthlyIncome", () => {
            const result = updateProfileSchema.safeParse({ defaultMonthlyIncome: -1 });
            expect(result.success).toBe(false);
        });
    });

    describe("changePasswordSchema", () => {
        it("accepts valid current and new password", () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: "oldpass",
                newPassword: "NewSecure@1",
            });
            expect(result.success).toBe(true);
        });

        it("rejects empty currentPassword", () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: "",
                newPassword: "NewSecure@1",
            });
            expect(result.success).toBe(false);
        });

        it("rejects weak newPassword", () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: "oldpass",
                newPassword: "short",
            });
            expect(result.success).toBe(false);
        });
    });
});
