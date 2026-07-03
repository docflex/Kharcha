"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { Dropzone } from "@/components/upload/dropzone";
import { ReviewTable, type ReviewEntry } from "@/components/upload/review-table";

import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useUploadScreenshots, useCommitExpenses } from "@/hooks/use-uploads";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageTour } from "@/hooks/use-page-tour";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

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
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                    Upload Screenshots
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground font-mono">
                    Drag and drop up to 5 Buddy app screenshots to extract expense data
                </p>
            </motion.div>

            {/* Processing overlay */}
            <AnimatePresence>
                {loading && step === "upload" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
                    >
                        <Loader2 className="size-10 animate-spin text-primary mb-4" />
                        <p className="font-bold text-lg">Processing screenshots...</p>
                        <p className="text-sm text-muted-foreground font-mono mt-1">
                            Running OCR extraction
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {step === "upload" && (
                <>
                    <motion.div
                        variants={item}
                        data-tour="upload-month-picker"
                        className="flex gap-3"
                    >
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
                    </motion.div>

                    {/* Desktop: full dropzone */}
                    <motion.div
                        variants={item}
                        data-tour="upload-dropzone"
                        className="hidden md:block"
                    >
                        <Dropzone
                            onFilesSelected={handleFilesSelected}
                            disabled={loading}
                            loading={loading}
                        />
                    </motion.div>

                    {/* Mobile: curved arrow pointing to FAB */}
                    <motion.div
                        variants={item}
                        className="md:hidden flex flex-col items-center pt-8 pb-4 relative"
                    >
                        {/* Hidden file input for FAB to trigger */}
                        <input
                            id="mobile-file-input"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (!e.target.files) return;
                                const files = Array.from(e.target.files).filter((f) =>
                                    f.type.startsWith("image/")
                                );
                                if (files.length > 0) handleFilesSelected(files);
                            }}
                            disabled={loading}
                        />

                        <p className="text-sm font-bold text-muted-foreground text-center">
                            Tap the <span className="text-primary">+</span> button below
                        </p>

                        {/* Fixed-position curved arrow anchored to the FAB */}
                        <motion.div
                            className="fixed bottom-40 right-5 z-30 text-primary pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.svg width="80" height="120" viewBox="0 0 80 120" fill="none">
                                <motion.path
                                    d="M 10 0 C 10 50, 55 70, 55 100"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeDasharray="5 5"
                                    fill="none"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                                />
                                <motion.polygon
                                    points="47,100 55,115 63,100"
                                    fill="currentColor"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 1, 1], y: [0, 0, 3, 0] }}
                                    transition={{
                                        opacity: { delay: 1.2 },
                                        y: {
                                            delay: 1.4,
                                            duration: 1,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        },
                                    }}
                                />
                            </motion.svg>
                        </motion.div>
                    </motion.div>

                    {errorMessage && (
                        <motion.div
                            variants={item}
                            className="flex items-center gap-2 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
                        >
                            <AlertCircle className="size-4 shrink-0" />
                            {errorMessage}
                        </motion.div>
                    )}
                </>
            )}

            {step === "review" && (
                <motion.div
                    variants={item}
                    className="rounded-lg border-2 border-border bg-card shadow-[3px_3px_0px_0px] shadow-border/50"
                >
                    <div className="border-b-2 border-border px-6 py-4">
                        <h2 className="text-lg font-black uppercase tracking-tight">
                            Review Extracted Data — {MONTHS[Number(month) - 1]} {year}
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {errorMessage && (
                            <div className="flex items-center gap-2 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                <AlertCircle className="size-4 shrink-0" />
                                {errorMessage}
                            </div>
                        )}
                        <ReviewTable
                            entries={reviewEntries}
                            onApprove={handleApprove}
                            loading={loading}
                        />
                    </div>
                </motion.div>
            )}

            {step === "done" && (
                <motion.div
                    variants={item}
                    className="rounded-lg border-2 border-border bg-card shadow-[3px_3px_0px_0px] shadow-border/50"
                >
                    <div className="flex flex-col items-center py-12 text-center px-6">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-green-500/30 bg-green-500/10">
                            <CheckCircle2 className="size-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">
                            {committedCount} Expense{committedCount !== 1 ? "s" : ""} Saved!
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground font-mono">
                            Added to {MONTHS[Number(month) - 1]} {year}
                        </p>
                        <button
                            onClick={resetFlow}
                            className="mt-6 inline-flex items-center gap-1.5 rounded-md border-2 border-border bg-background px-4 py-2 text-sm font-bold shadow-[2px_2px_0px_0px] shadow-border/50 hover:border-primary hover:text-primary active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                        >
                            Upload more screenshots
                            <ArrowRight className="size-3.5" />
                        </button>
                    </div>
                </motion.div>
            )}
            {confirmDialog}
        </motion.div>
    );
}
