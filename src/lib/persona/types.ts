// ─── Input Signals ──────────────────────────────────────────────────────────

/** All data needed by the persona engine to evaluate a month */
export interface PersonaSignals {
    year: number;
    month: number;
    totalSpend: number;
    totalIncome: number;
    savingsRate: number; // percentage: (income - spend) / income * 100
    momChangePct: number | null; // % change vs previous month total spend
    overBudgetCount: number;
    underBudgetCount: number;
    onTrackCount: number;
    totalBudgetedCategories: number;
    newCategories: string[]; // categories that appeared this month but not last
    droppedCategories: string[]; // categories that disappeared
    categoryMoMChanges: CategoryMoMSignal[];
    budgetStatuses: BudgetCategorySignal[];
    trends: TrendSignal[];
}

/** Per-category MoM change signal */
export interface CategoryMoMSignal {
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    previousAmount: number;
    percentChange: number | null;
}

/** Per-category budget signal */
export interface BudgetCategorySignal {
    categoryId: string;
    categoryName: string;
    actual: number;
    budgetLimit: number;
    percentUsed: number;
    status: "under" | "on-track" | "warning" | "over";
}

/** Per-category trend signal */
export interface TrendSignal {
    categoryId: string;
    categoryName: string;
    direction: "up" | "down" | "stable";
    consecutiveMonthsUp: number;
    consecutiveMonthsDown: number;
}

// ─── Persona Archetypes ─────────────────────────────────────────────────────

export type PersonaName =
    | "The Saver"
    | "The Optimizer"
    | "The Steady"
    | "The Explorer"
    | "The Generous"
    | "The Overachiever"
    | "The Stretcher"
    | "The Splurger"
    | "The Red Flagger";

export interface PersonaArchetype {
    name: PersonaName;
    emoji: string;
    description: string;
    /** Higher priority = checked first. If multiple match, highest priority wins. */
    priority: number;
    /** Returns true if this persona matches the given signals */
    matches: (signals: PersonaSignals) => boolean;
}

// ─── Output Types ───────────────────────────────────────────────────────────

export type InsightType =
    | "spending_increase"
    | "spending_decrease"
    | "over_budget"
    | "under_budget"
    | "unusual_expense"
    | "savings_trend"
    | "new_category";

export interface Insight {
    type: InsightType;
    message: string;
    categoryName?: string;
    /** Positive = good, negative = concerning */
    sentiment: "positive" | "negative" | "neutral";
}

export type RecommendationType = "cut_back" | "room_to_spend" | "watch_out" | "great_job";

export interface Recommendation {
    type: RecommendationType;
    message: string;
    categoryName: string;
    /** How much to cut or how much room remains */
    amount?: number;
}

/** The full persona result for a month */
export interface PersonaResult {
    year: number;
    month: number;
    persona: {
        name: PersonaName;
        emoji: string;
        description: string;
    };
    metrics: {
        totalSpend: number;
        totalIncome: number;
        savingsRate: number;
        momChangePct: number | null;
        overBudgetCount: number;
        underBudgetCount: number;
    };
    insights: Insight[];
    recommendations: Recommendation[];
}
