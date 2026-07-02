"use client";

import { motion } from "motion/react";
import { FileSpreadsheet, SkipForward } from "lucide-react";
import { Dropzone } from "@/components/upload/dropzone";
import { useUploadScreenshots } from "@/hooks/use-uploads";
import { toast } from "sonner";

interface ImportStepProps {
    onImported: () => void;
    onSkip: () => void;
}

export function ImportStep({ onImported, onSkip }: ImportStepProps) {
    const uploadMutation = useUploadScreenshots();

    async function handleFilesSelected(files: File[]) {
        const now = new Date();
        try {
            await uploadMutation.mutateAsync({
                files,
                year: String(now.getFullYear()),
                month: String(now.getMonth() + 1),
            });
            toast.success(`Processed ${files.length} screenshot(s)!`);
            onImported();
        } catch (_err) {
            toast.error("Upload failed. You can try again later from the Upload page.");
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center space-y-6 py-8"
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                <FileSpreadsheet className="h-8 w-8 text-blue-500" strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight uppercase md:text-3xl">
                    Import Data
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                    Have Buddy app screenshots? Drop them below and we&apos;ll extract expenses
                    automatically.
                </p>
            </div>

            <div className="w-full max-w-md">
                <Dropzone
                    onFilesSelected={handleFilesSelected}
                    loading={uploadMutation.isPending}
                    disabled={uploadMutation.isPending}
                />
            </div>

            <button
                onClick={onSkip}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
                <SkipForward className="h-4 w-4" strokeWidth={2.5} />
                Skip — I&apos;ll do this later
            </button>
        </motion.div>
    );
}
