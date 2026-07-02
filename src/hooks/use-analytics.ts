import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface CategorySpend {
    categoryId: string;
    categoryName: string;
    amount: number;
    type: string;
}

interface CategoryMoMChange {
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    previousAmount: number;
    absoluteChange: number;
    percentChange: number | null;
}

interface TrendDataPoint {
    year: number;
    month: number;
    amount: number;
}

export interface CategoryTrend {
    categoryId: string;
    categoryName: string;
    dataPoints: TrendDataPoint[];
    direction: string;
    averageAmount: number;
}

export interface AnalyticsData {
    summary: {
        totalSpend: number;
        totalInvestments: number;
        totalExpenses: number;
        categories: CategorySpend[];
    };
    mom: {
        totalCurrentSpend: number;
        totalPreviousSpend: number;
        totalPercentChange: number | null;
        categories: CategoryMoMChange[];
    };
    savings: {
        totalIncome: number;
        totalSpend: number;
        savings: number;
        savingsRate: number;
    };
    budgetOverview: {
        statuses: {
            categoryId: string;
            categoryName: string;
            actual: number;
            budgetLimit: number;
            percentUsed: number;
            status: string;
        }[];
        overBudgetCount: number;
        underBudgetCount: number;
        onTrackCount: number;
    };
    topCategories: CategorySpend[];
}

export interface SparklineData {
    months: string[];
    expenses: number[];
    income: number[];
}

export function useAnalytics(year: number, month: number) {
    return useQuery({
        queryKey: ["analytics", year, month],
        queryFn: () => apiClient.get<AnalyticsData>(`/api/analytics?year=${year}&month=${month}`),
    });
}

export function useSparkline(year: number, month: number) {
    return useQuery({
        queryKey: ["sparkline", year, month],
        queryFn: () =>
            apiClient.get<SparklineData>(
                `/api/analytics/sparkline?months=6&year=${year}&month=${month}`
            ),
    });
}

export function useTrends(year: number, month: number) {
    let startMonth = month - 5;
    let startYear = year;
    if (startMonth < 1) {
        startMonth += 12;
        startYear -= 1;
    }

    return useQuery({
        queryKey: ["trends", year, month],
        queryFn: () =>
            apiClient.get<CategoryTrend[]>(
                `/api/analytics/trends?startYear=${startYear}&startMonth=${startMonth}&endYear=${year}&endMonth=${month}`
            ),
    });
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

interface HeatmapCell {
    month: number;
    amount: number;
    intensity: number;
}

interface HeatmapRow {
    categoryId: string;
    categoryName: string;
    type: "expense" | "investment";
    months: HeatmapCell[];
}

export interface HeatmapData {
    year: number;
    categories: HeatmapRow[];
    maxAmount: number;
}

export function useHeatmap(year: number) {
    return useQuery({
        queryKey: ["heatmap", year],
        queryFn: () => apiClient.get<HeatmapData>(`/api/analytics/heatmap?year=${year}`),
    });
}

// ─── YoY Comparison ─────────────────────────────────────────────────────────

interface YoYCategorySpend {
    categoryId: string;
    categoryName: string;
    amount: number;
    type: string;
}

interface YoYYearData {
    year: number;
    totalSpend: number;
    categories: YoYCategorySpend[];
}

export interface YoYData {
    month: number;
    years: YoYYearData[];
    allCategories: string[];
}

export function useYoY(month: number) {
    return useQuery({
        queryKey: ["yoy", month],
        queryFn: () => apiClient.get<YoYData>(`/api/analytics/yoy?month=${month}`),
    });
}

// ─── Category Deep-Dive ─────────────────────────────────────────────────────

interface DeepDiveDataPoint {
    year: number;
    month: number;
    amount: number;
    budgetLimit: number | null;
    budgetStatus: "under" | "on-track" | "warning" | "over" | null;
    isAnomaly: boolean;
}

export interface CategoryDeepDiveData {
    categoryId: string;
    categoryName: string;
    categoryType: "expense" | "investment";
    dataPoints: DeepDiveDataPoint[];
    stats: {
        average: number;
        min: number;
        max: number;
        stddev: number;
        totalMonths: number;
    };
    budgetLimit: number | null;
}

export function useCategoryDeepDive(categoryId: string | null) {
    return useQuery({
        queryKey: ["category-deepdive", categoryId],
        queryFn: () => apiClient.get<CategoryDeepDiveData>(`/api/analytics/category/${categoryId}`),
        enabled: !!categoryId,
    });
}
