import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Profile {
    id: string;
    name: string;
    email: string;
    image: string | null;
    defaultMonthlyIncome: number | null;
    preferredCurrency: string | null;
    hasPassword: boolean;
    createdAt: string;
    updatedAt: string;
}

export function useProfile() {
    return useQuery({
        queryKey: ["profile"],
        queryFn: () => apiClient.get<Profile>("/api/user/profile"),
        staleTime: 30 * 60 * 1000,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name?: string;
            preferredCurrency?: string;
            defaultMonthlyIncome?: number;
        }) => apiClient.patch<Profile>("/api/user/profile", data),
        onSuccess: (data) => {
            queryClient.setQueryData(["profile"], data);
        },
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (data: { currentPassword: string; newPassword: string }) =>
            apiClient.post("/api/user/password", data),
    });
}
