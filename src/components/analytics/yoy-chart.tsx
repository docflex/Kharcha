"use client";

import {
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { useCurrency } from "@/contexts/currency-context";
import { monthNumberToName } from "@/lib/utils/dates";
import type { YoYData } from "@/hooks/use-analytics";

const YEAR_COLORS = ["#F59E0B", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6"];

interface YoYChartProps {
    data: YoYData;
}

export function YoYChart({ data }: YoYChartProps) {
    const { format: formatAmount } = useCurrency();

    if (data.years.length === 0) {
        return (
            <div className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50">
                <p className="text-sm text-muted-foreground font-mono">
                    No data for {monthNumberToName(data.month)} across any year.
                </p>
            </div>
        );
    }

    // Build grouped bar data: one bar per year
    const chartData = data.years.map((y, i) => ({
        name: String(y.year),
        total: y.totalSpend,
        fill: YEAR_COLORS[i % YEAR_COLORS.length],
    }));

    return (
        <div className="rounded-lg border-2 border-border bg-card p-4 md:p-5 shadow-[3px_3px_0px_0px] shadow-border/50">
            <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                Year-over-Year — {monthNumberToName(data.month)}
            </h2>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis
                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                            className="text-xs"
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0];
                                return (
                                    <div className="rounded-lg border-2 border-border bg-card p-3 shadow-[3px_3px_0px_0px] shadow-border/50">
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                            {d.payload.name}
                                        </p>
                                        <p className="text-sm font-mono font-bold">
                                            {formatAmount(d.value as number)}
                                        </p>
                                    </div>
                                );
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="total"
                            name="Total Spend"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={600}
                        >
                            {chartData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {/* Per-year breakdown */}
            {data.years.length > 1 && (
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {data.years.map((y, i) => {
                        const prevYear = i > 0 ? data.years[i - 1] : null;
                        const changePct =
                            prevYear && prevYear.totalSpend > 0
                                ? ((y.totalSpend - prevYear.totalSpend) / prevYear.totalSpend) * 100
                                : null;
                        return (
                            <div
                                key={y.year}
                                className="rounded-md border border-border p-2 text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold">{y.year}</span>
                                    <span className="font-mono font-bold">
                                        {formatAmount(y.totalSpend)}
                                    </span>
                                </div>
                                {changePct !== null && (
                                    <span
                                        className={`font-mono text-[10px] ${
                                            changePct > 0
                                                ? "text-destructive"
                                                : changePct < 0
                                                  ? "text-green-500"
                                                  : "text-muted-foreground"
                                        }`}
                                    >
                                        {changePct > 0 ? "↑" : changePct < 0 ? "↓" : "→"}{" "}
                                        {Math.abs(changePct).toFixed(1)}% vs {y.year - 1}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
