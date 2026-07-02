import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
    users,
    categories,
    expenses,
    budgets,
    monthlyIncome,
    uploads,
    personas,
} from "@/lib/db/schema";

// ─── Database Model Types ────────────────────────────────────────────────────

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Expense = InferSelectModel<typeof expenses>;
export type NewExpense = InferInsertModel<typeof expenses>;

export type Budget = InferSelectModel<typeof budgets>;
export type NewBudget = InferInsertModel<typeof budgets>;

export type MonthlyIncome = InferSelectModel<typeof monthlyIncome>;
export type NewMonthlyIncome = InferInsertModel<typeof monthlyIncome>;

export type Upload = InferSelectModel<typeof uploads>;
export type NewUpload = InferInsertModel<typeof uploads>;

export type Persona = InferSelectModel<typeof personas>;
export type NewPersona = InferInsertModel<typeof personas>;

// ─── OCR Types ───────────────────────────────────────────────────────────────

export interface OcrExtractedEntry {
    category: string;
    amount: number;
    confidence: number;
    sourceImage: string;
    lineIndex: number;
}

export interface OcrBatchResult {
    entries: OcrExtractedEntry[];
    metadata?: {
        month?: string;
        year?: number;
        income?: number;
        totalExpenses?: number;
    };
    conflicts: OcrConflict[];
}

export interface OcrConflict {
    category: string;
    amounts: { amount: number; confidence: number; source: string }[];
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface MonthSummary {
    year: number;
    month: number;
    totalSpend: number;
    totalInvestments: number;
    totalExpensesOnly: number;
    income: number;
    savingsRate: number;
    categories: CategorySummary[];
}

export interface CategorySummary {
    categoryId: string;
    categoryName: string;
    amount: number;
    budget: number | null;
    budgetPct: number | null;
    momChange: number | null;
    type: "expense" | "investment";
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}
