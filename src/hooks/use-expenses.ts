import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Expense {
    id: string;
    categoryId: string;
    year: number;
    month: number;
    amount: number;
    source: "manual" | "ocr" | "import";
    confidence: number | null;
    notes: string | null;
}

export interface ExpenseRow extends Expense {
    categoryName: string;
}

interface ExpenseInput {
    categoryId: string;
    year: number;
    month: number;
    amount: number;
    source: "manual" | "ocr" | "import";
    notes?: string;
}

export function useExpenses(year: number, month: number | null, categoryId: string | null) {
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (month !== null) params.set("month", String(month));
    if (categoryId) params.set("categoryId", categoryId);

    return useQuery({
        queryKey: ["expenses", year, month, categoryId],
        queryFn: () => apiClient.get<Expense[]>(`/api/expenses?${params}`),
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ExpenseInput) => apiClient.post("/api/expenses", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<ExpenseInput> & { id: string }) =>
            apiClient.patch(`/api/expenses/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useBulkDeleteExpenses() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ids: string[]) =>
            apiClient.post<{ deleted: number }>("/api/expenses/bulk-delete", { ids }),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useBulkUpdateExpenses() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { ids: string[]; categoryId: string }) =>
            apiClient.post<{ updated: number }>("/api/expenses/bulk-update", data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/expenses/${id}`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["expenses"] });
            const queries = queryClient.getQueriesData<Expense[]>({ queryKey: ["expenses"] });
            const snapshots = queries.map(([key, data]) => [key, data] as const);
            for (const [key] of queries) {
                queryClient.setQueryData<Expense[]>(key, (old) =>
                    old ? old.filter((e) => e.id !== id) : old
                );
            }
            return { snapshots };
        },
        onError: (_err, _id, context) => {
            if (context?.snapshots) {
                for (const [key, data] of context.snapshots) {
                    queryClient.setQueryData(key, data);
                }
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}
