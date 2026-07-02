"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const CATEGORY_COLORS = [
    { name: "slate", value: "#64748b" },
    { name: "red", value: "#ef4444" },
    { name: "orange", value: "#f97316" },
    { name: "amber", value: "#f59e0b" },
    { name: "lime", value: "#84cc16" },
    { name: "green", value: "#22c55e" },
    { name: "teal", value: "#14b8a6" },
    { name: "cyan", value: "#06b6d4" },
    { name: "blue", value: "#3b82f6" },
    { name: "indigo", value: "#6366f1" },
    { name: "purple", value: "#a855f7" },
    { name: "pink", value: "#ec4899" },
];

interface ColorPickerProps {
    value: string | null;
    onChange: (color: string | null) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="space-y-1.5">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border-2 transition-colors",
                    value ? "border-primary" : "border-border hover:border-primary"
                )}
            >
                {value ? (
                    <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: value }}
                    />
                ) : (
                    <span className="text-[10px] text-muted-foreground">Color</span>
                )}
            </button>

            {open && (
                <div className="grid grid-cols-6 gap-1.5 rounded-md border-2 border-border bg-card p-2 shadow-[2px_2px_0px_0px] shadow-border/50">
                    {/* None option */}
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null);
                            setOpen(false);
                        }}
                        className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors text-[10px]",
                            !value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary"
                        )}
                        title="None"
                    >
                        ✕
                    </button>
                    {CATEGORY_COLORS.map(({ name, value: colorValue }) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => {
                                onChange(colorValue);
                                setOpen(false);
                            }}
                            className={cn(
                                "h-7 w-7 rounded-full border-2 transition-all",
                                value === colorValue
                                    ? "border-foreground scale-110 shadow-[1px_1px_0px_0px] shadow-foreground"
                                    : "border-transparent hover:border-border hover:scale-105"
                            )}
                            style={{ backgroundColor: colorValue }}
                            title={name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
