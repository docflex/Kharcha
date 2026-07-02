"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "destructive" | "default";
    onConfirm: () => void;
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    variant = "destructive",
    onConfirm,
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="border-2 border-border shadow-[4px_4px_0px_0px] shadow-border/50"
            >
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        {variant === "destructive" && (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-destructive/30 bg-destructive/10">
                                <TriangleAlert className="h-5 w-5 text-destructive" />
                            </div>
                        )}
                        <div>
                            <DialogTitle className="text-base font-black uppercase">
                                {title}
                            </DialogTitle>
                            {description && (
                                <DialogDescription className="mt-1">
                                    {description}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        disabled={loading}
                        className={
                            variant === "destructive"
                                ? "border-2 border-destructive/50 shadow-[2px_2px_0px_0px] shadow-destructive/30 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                                : "border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                        }
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Hook to manage confirm dialog state.
 * Returns { confirm, dialog } where:
 * - confirm(opts) opens the dialog and returns void
 * - dialog is the JSX element to render
 */
export function useConfirmDialog() {
    const [state, setState] = React.useState<{
        open: boolean;
        title: string;
        description?: string;
        confirmLabel?: string;
        variant?: "destructive" | "default";
        onConfirm: () => void;
    }>({
        open: false,
        title: "",
        onConfirm: () => {},
    });

    const confirm = React.useCallback(
        (opts: {
            title: string;
            description?: string;
            confirmLabel?: string;
            variant?: "destructive" | "default";
            onConfirm: () => void;
        }) => {
            setState({ ...opts, open: true });
        },
        []
    );

    const dialog = (
        <ConfirmDialog
            open={state.open}
            onOpenChange={(open) => setState((s) => ({ ...s, open }))}
            title={state.title}
            description={state.description}
            confirmLabel={state.confirmLabel}
            variant={state.variant}
            onConfirm={state.onConfirm}
        />
    );

    return { confirm, dialog };
}
