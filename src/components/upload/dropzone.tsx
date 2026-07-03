"use client";

import { useCallback, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_SCREENSHOTS_PER_BATCH } from "@/lib/constants";

interface DropzoneProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
    loading?: boolean;
}

export function Dropzone({ onFilesSelected, disabled, loading }: DropzoneProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleDrag = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (disabled) return;
            if (e.type === "dragenter" || e.type === "dragover") {
                setDragActive(true);
            } else if (e.type === "dragleave") {
                setDragActive(false);
            }
        },
        [disabled]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (disabled) return;

            const files = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/")
            );
            if (files.length > 0) {
                const combined = [...selectedFiles, ...files].slice(0, MAX_SCREENSHOTS_PER_BATCH);
                setSelectedFiles(combined);
            }
        },
        [disabled, selectedFiles]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (disabled || !e.target.files) return;
            const files = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
            const combined = [...selectedFiles, ...files].slice(0, MAX_SCREENSHOTS_PER_BATCH);
            setSelectedFiles(combined);
        },
        [disabled, selectedFiles]
    );

    const removeFile = useCallback((index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpload = useCallback(() => {
        if (selectedFiles.length > 0) {
            onFilesSelected(selectedFiles);
        }
    }, [selectedFiles, onFilesSelected]);

    return (
        <div className="space-y-4">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
          relative flex flex-col items-center justify-center
          rounded-lg border-2 border-dashed p-4 md:p-8
          transition-all duration-200 ease-in-out
          ${
              dragActive
                  ? "border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 shadow-[3px_3px_0px_0px] shadow-amber-500/30"
                  : "border-border hover:border-muted-foreground/50 shadow-[3px_3px_0px_0px] shadow-border/50"
          }
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        `}
                onClick={() => {
                    if (!disabled) {
                        document.getElementById("file-input")?.click();
                    }
                }}
            >
                <input
                    id="file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                    disabled={disabled}
                />

                {loading ? (
                    <Loader2 className="mb-2 md:mb-3 size-6 md:size-10 animate-spin text-amber-500" />
                ) : (
                    <Upload
                        className="mb-2 md:mb-3 size-6 md:size-10 text-muted-foreground"
                        strokeWidth={1.5}
                    />
                )}

                <p className="text-xs md:text-sm font-medium">
                    {loading
                        ? "Processing screenshots..."
                        : "Tap to select or drag & drop screenshots"}
                </p>
                <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-muted-foreground">
                    PNG or JPG, up to {MAX_SCREENSHOTS_PER_BATCH} files
                </p>
            </div>

            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Selected ({selectedFiles.length}/{MAX_SCREENSHOTS_PER_BATCH})
                    </p>
                    <div className="grid gap-2">
                        {selectedFiles.map((file, i) => (
                            <div
                                key={`${file.name}-${i}`}
                                className="flex items-center gap-3 rounded-lg border-2 border-border bg-card p-2 text-sm shadow-[2px_2px_0px_0px] shadow-border/50"
                            >
                                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1 truncate font-mono text-xs">
                                    {file.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(0)} KB
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(i);
                                    }}
                                    className="rounded p-0.5 hover:bg-muted"
                                    disabled={disabled}
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={disabled || loading}
                        className="w-full font-bold border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground hover:shadow-[3px_3px_0px_0px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload className="size-4" />
                                Upload & Process ({selectedFiles.length} file
                                {selectedFiles.length !== 1 ? "s" : ""})
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
