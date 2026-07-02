import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Budget {
    id: string;
    categoryId: string;
    monthlyLimit: number;
    effectiveFrom: string;
    effectiveUntil: string | null;
}

export function useBudgets() {
    return useQuery({
        queryKey: ["budgets"],
        queryFn: () => apiClient.get<Budget[]>("/api/budgets"),
    });
}

export function useCreateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { categoryId: string; monthlyLimit: number; effectiveFrom: string }) =>
            apiClient.post("/api/budgets", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useDeleteBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/budgets/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}
