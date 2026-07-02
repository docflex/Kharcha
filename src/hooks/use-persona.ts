import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface PersonaData {
    year: number;
    month: number;
    persona: {
        name: string;
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
    insights: {
        type: string;
        message: string;
        categoryName?: string;
        sentiment: "positive" | "negative" | "neutral";
    }[];
    recommendations: {
        type: string;
        message: string;
        categoryName: string;
        amount?: number;
    }[];
}

export interface HistoryEntry {
    year: number;
    month: number;
    personaName: string;
    personaEmoji: string;
    savingsRate: number | null;
    totalSpend: number | null;
}

export function usePersona(year: number, month: number) {
    return useQuery({
        queryKey: ["persona", year, month],
        queryFn: () => apiClient.get<PersonaData>(`/api/persona?year=${year}&month=${month}`),
    });
}

export function usePersonaHistory() {
    return useQuery({
        queryKey: ["persona", "history"],
        queryFn: () => apiClient.get<HistoryEntry[]>("/api/persona?history=true"),
        staleTime: 5 * 60 * 1000,
    });
}
