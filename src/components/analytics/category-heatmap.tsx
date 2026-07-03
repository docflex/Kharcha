"use client";

import Link from "next/link";
import { Grid3X3 } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { monthNumberToName } from "@/lib/utils/dates";
import type { HeatmapData } from "@/hooks/use-analytics";

/**
 * Color scale: transparent → amber → red
 * intensity 0 = no spend, 1 = max across grid
 */
function intensityColor(intensity: number): string {
    if (intensity === 0) return "transparent";
    if (intensity < 0.3) return `rgba(245, 158, 11, ${0.15 + intensity})`;
    if (intensity < 0.6) return `rgba(245, 158, 11, ${0.3 + intensity * 0.5})`;
    if (intensity < 0.85) return `rgba(239, 68, 68, ${0.3 + intensity * 0.4})`;
    return `rgba(239, 68, 68, ${0.5 + intensity * 0.4})`;
}

interface CategoryHeatmapProps {
    data: HeatmapData;
}

export function CategoryHeatmap({ data }: CategoryHeatmapProps) {
    const { format: formatAmount } = useCurrency();
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    if (data.categories.length === 0) {
        return (
            <div className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50 space-y-3">
                <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-border bg-muted/50">
                        <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
                <p className="text-sm font-bold">No heatmap data</p>
                <p className="text-xs text-muted-foreground font-mono">
                    Add expenses for {data.year} to see category patterns
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border-2 border-border bg-card p-4 md:p-5 shadow-[3px_3px_0px_0px] shadow-border/50">
            <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                Category Heatmap — {data.year}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                    <thead>
                        <tr>
                            <th className="text-left py-1.5 px-2 font-bold uppercase tracking-wider text-muted-foreground border-b border-border w-[120px]">
                                Category
                            </th>
                            {months.map((m) => (
                                <th
                                    key={m}
                                    className="text-center py-1.5 px-1 font-bold uppercase tracking-wider text-muted-foreground border-b border-border"
                                >
                                    {monthNumberToName(m, "short")?.slice(0, 3)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.categories.map((cat) => (
                            <tr key={cat.categoryId} className="group">
                                <td className="py-1.5 px-2 font-bold truncate max-w-[120px] border-b border-border/50">
                                    <Link
                                        href={`/analytics/category/${cat.categoryId}`}
                                        className="hover:text-amber-500 transition-colors"
                                    >
                                        {cat.categoryName}
                                    </Link>
                                </td>
                                {cat.months.map((cell) => (
                                    <td
                                        key={cell.month}
                                        className="py-1.5 px-1 text-center border-b border-border/50"
                                        title={`${cat.categoryName} · ${monthNumberToName(cell.month, "short")}: ${formatAmount(cell.amount)}`}
                                    >
                                        <div
                                            className="mx-auto h-6 w-full rounded-sm border border-border/30 flex items-center justify-center transition-all hover:scale-110"
                                            style={{
                                                backgroundColor: intensityColor(cell.intensity),
                                            }}
                                        >
                                            {cell.amount > 0 && (
                                                <span className="text-[9px] font-mono font-bold opacity-80">
                                                    {cell.amount >= 1000
                                                        ? `${(cell.amount / 1000).toFixed(0)}k`
                                                        : cell.amount.toFixed(0)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Color scale legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                <span>Low</span>
                <div className="flex gap-0.5">
                    {[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].map((i) => (
                        <div
                            key={i}
                            className="h-3 w-5 rounded-sm border border-border/30"
                            style={{ backgroundColor: intensityColor(i) }}
                        />
                    ))}
                </div>
                <span>High</span>
            </div>
        </div>
    );
}
