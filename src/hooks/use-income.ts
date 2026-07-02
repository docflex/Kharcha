import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface IncomeEntry {
    id: string;
    year: number;
    month: number;
    amount: number;
    source: string | null;
    createdAt: string;
}

export function useIncome(filterYear: number | null) {
    const params = new URLSearchParams();
    if (filterYear) params.set("year", String(filterYear));

    return useQuery({
        queryKey: ["income", filterYear],
        queryFn: () => apiClient.get<IncomeEntry[]>(`/api/income?${params}`),
    });
}

export function useCreateIncome() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { year: number; month: number; amount: number; source: string }) =>
            apiClient.post<IncomeEntry>("/api/income", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["income"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useUpdateIncome() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            ...data
        }: { id: string } & Partial<{
            year: number;
            month: number;
            amount: number;
            source: string;
        }>) => apiClient.patch<IncomeEntry>(`/api/income/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["income"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useDeleteIncome() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/income/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["income"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useUploadPaystub() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return apiClient.postForm<{
                parsed: { source: string; netPay: number; month: number; year: number };
            }>("/api/income/upload", formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["income"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}
