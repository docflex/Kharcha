import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface EmailStatus {
    configured: boolean;
    connected: boolean;
}

export interface EmailLogEntry {
    id: string;
    type: string;
    subject: string | null;
    sentAt: number | null;
    status: string;
}

export function useEmailStatus() {
    return useQuery({
        queryKey: ["email", "status"],
        queryFn: () => apiClient.get<EmailStatus>("/api/email?action=status"),
        staleTime: 60 * 1000,
    });
}

export function useEmailLog() {
    return useQuery({
        queryKey: ["email", "log"],
        queryFn: () => apiClient.get<EmailLogEntry[]>("/api/email?action=log"),
    });
}

export function useSendTestEmail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { type: string; year: number; month: number }) =>
            apiClient.post<{ success: boolean }>("/api/email", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["email", "log"] });
        },
    });
}
