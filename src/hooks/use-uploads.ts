import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadResult {
    id: string;
    fileName: string;
    status: string;
}

interface ProcessedEntry {
    category: string;
    amount: number;
    confidence: number;
    conflict?: boolean;
    sourceImage?: string;
}

interface ProcessBatchResult {
    entries: ProcessedEntry[];
    duplicatesSkipped: number;
}

interface CommitResult {
    committed: number;
}

export function useUploadScreenshots() {
    return useMutation({
        mutationFn: async ({
            files,
            year,
            month,
        }: {
            files: File[];
            year: string;
            month: string;
        }) => {
            const formData = new FormData();
            files.forEach((f) => formData.append("files", f));
            formData.append("year", year);
            formData.append("month", month);

            const res = await fetch("/api/uploads", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }

            const json = await res.json();
            const ids = (json.data as UploadResult[]).map((u) => u.id);
            const entries = (json.ocr?.entries as ProcessedEntry[]) || [];
            return { entries, uploadIds: ids };
        },
    });
}

export function useCommitExpenses() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            uploadId,
            entries,
        }: {
            uploadId: string;
            entries: { categoryId: string; amount: number; confidence: number }[];
        }) => {
            const res = await fetch(`/api/uploads/${uploadId}/commit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entries }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Commit failed");
            }

            return (await res.json()).data as CommitResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["sparkline"] });
            queryClient.invalidateQueries({ queryKey: ["snapshot"] });
        },
    });
}
