import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Expense } from "@/hooks/use-expenses";
import type { IncomeEntry } from "@/hooks/use-income";
import type { Category } from "@/hooks/use-categories";
import type { Budget } from "@/hooks/use-budgets";

export interface Snapshot {
    year: number;
    version: number;
    expenses: Expense[];
    income: IncomeEntry[];
    categories: Category[];
    budgets: Budget[];
}

/**
 * Fetch a yearly snapshot of all data. Past years get staleTime: Infinity.
 * Current year gets staleTime: 30 minutes.
 */
export function useSnapshot(year: number) {
    const currentYear = new Date().getFullYear();
    const isPastYear = year < currentYear;

    return useQuery({
        queryKey: ["snapshot", year],
        queryFn: () => apiClient.get<Snapshot>(`/api/snapshot?year=${year}`),
        staleTime: isPastYear ? Infinity : 30 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}
