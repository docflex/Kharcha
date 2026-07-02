import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Category {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    type: "expense" | "investment";
}

export function useCategories() {
    return useQuery({
        queryKey: ["categories"],
        queryFn: () => apiClient.get<Category[]>("/api/categories"),
        staleTime: 30 * 60 * 1000,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            type: "expense" | "investment";
            icon?: string | null;
            color?: string | null;
        }) => apiClient.post("/api/categories", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            ...data
        }: {
            id: string;
            name?: string;
            type?: "expense" | "investment";
            icon?: string | null;
            color?: string | null;
        }) => apiClient.patch(`/api/categories/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}

export interface CategoryStat {
    categoryId: string;
    count: number;
    totalAmount: number;
}

export function useCategoryStats() {
    return useQuery({
        queryKey: ["category-stats"],
        queryFn: () => apiClient.get<CategoryStat[]>("/api/categories/stats"),
        staleTime: 5 * 60 * 1000,
    });
}
