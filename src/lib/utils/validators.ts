import { z } from "zod/v4";

// ─── Category ────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
    name: z.string().min(1).max(50),
    icon: z.string().optional(),
    color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    type: z.enum(["expense", "investment"]).default("expense"),
    parentId: z.string().uuid().optional(),
    sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── Expense ─────────────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
    categoryId: z.string().min(1),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    amount: z.number().positive(),
    source: z.enum(["manual", "ocr", "import"]).default("manual"),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().max(500).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const bulkDeleteExpensesSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(500),
});

export const bulkUpdateExpensesSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(500),
    categoryId: z.string().min(1),
});

// ─── Budget ──────────────────────────────────────────────────────────────────

export const createBudgetSchema = z.object({
    categoryId: z.string().min(1),
    monthlyLimit: z.number().positive(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/), // 'YYYY-MM'
    effectiveUntil: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// ─── Monthly Income ──────────────────────────────────────────────────────────

export const createIncomeSchema = z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    amount: z.number().positive(),
    source: z.string().max(100).optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();

// ─── Auth ────────────────────────────────────────────────────────────────────

const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a digit")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const registerSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: passwordSchema,
});

// ─── Profile ────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    preferredCurrency: z.string().min(1).max(10).optional(),
    defaultMonthlyIncome: z.number().positive().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
});
