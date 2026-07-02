"use client";

import { X } from "lucide-react";

interface DeltaEntry {
    key: string;
    startVal: number;
    endVal: number;
    diff: number;
    pct: number | null;
}

interface ChartDeltaOverlayProps {
    startLabel: string;
    endLabel: string;
    deltas: DeltaEntry[];
    formatValue: (v: number) => string;
    onClear: () => void;
}

export function ChartDeltaOverlay({
    startLabel,
    endLabel,
    deltas,
    formatValue,
    onClear,
}: ChartDeltaOverlayProps) {
    if (deltas.length === 0) return null;

    return (
        <div className="absolute top-2 right-2 z-20 rounded-lg border-2 border-border bg-card/95 backdrop-blur-sm p-2.5 shadow-[3px_3px_0px_0px] shadow-border/50 max-w-[220px]">
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">
                    {startLabel} → {endLabel}
                </span>
                <button
                    onClick={onClear}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0"
                    aria-label="Clear selection"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
            {deltas.map((d) => {
                const isPositive = d.diff > 0;
                const isNegative = d.diff < 0;
                const color = isPositive
                    ? "text-green-500"
                    : isNegative
                      ? "text-destructive"
                      : "text-muted-foreground";

                return (
                    <div key={d.key} className="flex items-baseline justify-between gap-2">
                        {deltas.length > 1 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                {d.key}
                            </span>
                        )}
                        <span className={`text-sm font-mono font-black ${color}`}>
                            {isPositive ? "+" : ""}
                            {formatValue(d.diff)}
                        </span>
                        {d.pct !== null && (
                            <span className={`text-[10px] font-mono ${color}`}>
                                {isPositive ? "+" : ""}
                                {Math.round(d.pct)}%
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
