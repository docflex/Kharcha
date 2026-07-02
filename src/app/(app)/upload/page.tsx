"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { Dropzone } from "@/components/upload/dropzone";
import { ReviewTable, type ReviewEntry } from "@/components/upload/review-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useUploadScreenshots, useCommitExpenses } from "@/hooks/use-uploads";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageTour } from "@/hooks/use-page-tour";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function currentMonth() {
    return new Date().getMonth() + 1;
}

function currentYear() {
    return new Date().getFullYear();
}

type UploadStep = "upload" | "review" | "done";

export default function UploadPage() {
    const globalStore = useAppStore();
    const [step, setStep] = useState<UploadStep>("upload");
    const [month, setMonth] = useState(String(globalStore.month));
    const [year, setYear] = useState(String(globalStore.year));
    const [reviewEntries, setReviewEntries] = useState<ReviewEntry[]>([]);
    const [uploadIds, setUploadIds] = useState<string[]>([]);
    const [committedCount, setCommittedCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const uploadMutation = useUploadScreenshots();
    const commitMutation = useCommitExpenses();
    const loading = uploadMutation.isPending || commitMutation.isPending;

    usePageTour("upload", step === "upload");

    const handleFilesSelected = useCallback(
        async (files: File[]) => {
            setErrorMessage(null);
            try {
                const result = await uploadMutation.mutateAsync({ files, year, month });
                setUploadIds(result.uploadIds);

                const allEntries: ReviewEntry[] = result.entries.map(
                    (
                        e: {
                            category: string;
                            amount: number;
                            confidence: number;
                            conflict?: boolean;
                            sourceImage?: string;
                        },
                        i: number
                    ) => ({
                        id: `batch-${i}`,
                        category: e.category,
                        amount: e.amount,
                        confidence: e.confidence,
                        conflict: e.conflict,
                        sourceImage: e.sourceImage,
                        approved: e.confidence >= 0.5,
                    })
                );

                setReviewEntries(allEntries);
                setStep("review");
                toast.success("Screenshots processed — review entries below");
            } catch (error) {
                const msg = error instanceof Error ? error.message : "Upload failed";
                setErrorMessage(msg);
                toast.error(msg);
            }
        },
        [year, month, uploadMutation]
    );

    const { confirm, dialog: confirmDialog } = useConfirmDialog();

    const handleApprove = useCallback(
        (entries: ReviewEntry[]) => {
            confirm({
                title: "Commit Expenses",
                description: `Save ${entries.length} expense${entries.length !== 1 ? "s" : ""}? This cannot be undone.`,
                confirmLabel: "Commit",
                variant: "default",
                onConfirm: async () => {
                    setErrorMessage(null);
                    try {
                        const firstUploadId = uploadIds[0];
                        if (!firstUploadId) return;

                        await commitMutation.mutateAsync({
                            uploadId: firstUploadId,
                            entries: entries.map((e) => ({
                                categoryId: e.category,
                                amount: e.amount,
                                confidence: e.confidence,
                            })),
                        });

                        setCommittedCount(entries.length);
                        setStep("done");
                        toast.success(
                            `${entries.length} expense${entries.length !== 1 ? "s" : ""} committed`
                        );
                    } catch (error) {
                        const msg = error instanceof Error ? error.message : "Commit failed";
                        setErrorMessage(msg);
                        toast.error(msg);
                    }
                },
            });
        },
        [uploadIds, commitMutation, confirm]
    );

    const resetFlow = useCallback(() => {
        setStep("upload");
        setReviewEntries([]);
        setUploadIds([]);
        setCommittedCount(0);
        setErrorMessage(null);
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Upload Screenshots</h1>
                <p className="text-muted-foreground">
                    Drag and drop up to 5 Buddy app screenshots to extract expense data
                </p>
            </div>

            {step === "upload" && (
                <>
                    <div data-tour="upload-month-picker" className="flex gap-3">
                        <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                Month
                            </label>
                            <Select
                                value={month}
                                onValueChange={(v) => v && setMonth(v)}
                                items={Object.fromEntries(MONTHS.map((m, i) => [String(i + 1), m]))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m, i) => (
                                        <SelectItem key={i + 1} value={String(i + 1)}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-28">
                            <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                Year
                            </label>
                            <Select value={year} onValueChange={(v) => v && setYear(v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[currentYear() - 1, currentYear(), currentYear() + 1].map(
                                        (y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div data-tour="upload-dropzone">
                        <Dropzone
                            onFilesSelected={handleFilesSelected}
                            disabled={loading}
                            loading={loading}
                        />
                    </div>

                    {errorMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            {errorMessage}
                        </div>
                    )}
                </>
            )}

            {step === "review" && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Review Extracted Data — {MONTHS[Number(month) - 1]} {year}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {errorMessage && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                <AlertCircle className="size-4 shrink-0" />
                                {errorMessage}
                            </div>
                        )}
                        <ReviewTable
                            entries={reviewEntries}
                            onApprove={handleApprove}
                            loading={loading}
                        />
                    </CardContent>
                </Card>
            )}

            {step === "done" && (
                <Card>
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <CheckCircle2 className="mb-4 size-12 text-green-500" />
                        <h2 className="text-xl font-bold">
                            {committedCount} Expense{committedCount !== 1 ? "s" : ""} Saved!
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Added to {MONTHS[Number(month) - 1]} {year}
                        </p>
                        <button
                            onClick={resetFlow}
                            className="mt-6 text-sm font-medium text-amber-500 underline-offset-4 hover:underline"
                        >
                            Upload more screenshots
                        </button>
                    </CardContent>
                </Card>
            )}
            {confirmDialog}
        </div>
    );
}
