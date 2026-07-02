import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "../db/schema";

export // eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema>;

/** A single category's spending for one month */
export interface CategorySpend {
    categoryId: string;
    categoryName: string;
    amount: number;
    type: "expense" | "investment";
}

/** Summary for a single month */
export interface MonthSummary {
    year: number;
    month: number;
    totalSpend: number;
    totalInvestments: number;
    totalExpenses: number; // totalSpend - totalInvestments
    categories: CategorySpend[];
}

/** MoM change for a single category */
export interface CategoryMoMChange {
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    previousAmount: number;
    absoluteChange: number;
    percentChange: number | null; // null if previous was 0
}

/** MoM comparison result */
export interface MoMComparison {
    current: { year: number; month: number };
    previous: { year: number; month: number };
    totalCurrentSpend: number;
    totalPreviousSpend: number;
    totalAbsoluteChange: number;
    totalPercentChange: number | null;
    categories: CategoryMoMChange[];
    newCategories: string[]; // categories present now but not before
    droppedCategories: string[]; // categories present before but not now
}

/** Budget vs actual for one category */
export interface BudgetStatus {
    categoryId: string;
    categoryName: string;
    actual: number;
    budgetLimit: number;
    remaining: number;
    percentUsed: number;
    status: "under" | "on-track" | "warning" | "over";
}

/** Monthly budget overview */
export interface BudgetOverview {
    year: number;
    month: number;
    statuses: BudgetStatus[];
    overBudgetCount: number;
    underBudgetCount: number;
    onTrackCount: number;
}

/** Savings calculation result */
export interface SavingsResult {
    year: number;
    month: number;
    totalIncome: number;
    totalSpend: number;
    savings: number;
    savingsRate: number; // (income - spend) / income as percentage
}

/** Trend direction */
export type TrendDirection = "up" | "down" | "stable";

/** Category trend over multiple months */
export interface CategoryTrend {
    categoryId: string;
    categoryName: string;
    dataPoints: { year: number; month: number; amount: number }[];
    direction: TrendDirection;
    averageAmount: number;
    minAmount: number;
    maxAmount: number;
}
