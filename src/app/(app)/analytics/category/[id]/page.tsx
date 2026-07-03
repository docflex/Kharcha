"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useCategoryDeepDive } from "@/hooks/use-analytics";
import { monthNumberToName } from "@/lib/utils/dates";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function CategoryDeepDivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { format: formatAmount } = useCurrency();
    const { data, isLoading, error } = useCategoryDeepDive(id);

    if (isLoading) {
        return (
            <div className="space-y-4 p-4 md:p-6 lg:p-8">
                <div className="h-6 w-48 rounded bg-muted animate-pulse" />
                <div className="h-[350px] rounded-lg border-2 border-border bg-muted/50 animate-pulse" />
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-24 rounded-lg border-2 border-border bg-muted/50 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Analytics
                </Link>
                <div className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50">
                    <p className="text-sm text-muted-foreground font-mono">
                        {error ? "Failed to load category data" : "Category not found"}
                    </p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const chartData = data.dataPoints.map((dp) => ({
        label: `${monthNumberToName(dp.month, "short")?.slice(0, 3)} ${String(dp.year).slice(2)}`,
        amount: dp.amount,
        budget: dp.budgetLimit,
        isAnomaly: dp.isAnomaly,
    }));

    // Compute overall trend direction
    const amounts = data.dataPoints.map((dp) => dp.amount);
    const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
    const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
    const avgFirst =
        firstHalf.length > 0 ? firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length : 0;
    const avgSecond =
        secondHalf.length > 0 ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : 0;
    const trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

    const overBudgetCount = data.dataPoints.filter((dp) => dp.budgetStatus === "over").length;
    const anomalyCount = data.dataPoints.filter((dp) => dp.isAnomaly).length;

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6 p-4 md:p-6 lg:p-8"
        >
            {/* Header */}
            <motion.div variants={item}>
                <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
                >
                    <ArrowLeft className="h-4 w-4" /> Analytics
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black tracking-tight uppercase md:text-3xl">
                        {data.categoryName}
                    </h1>
                    <span className="rounded-md border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {data.categoryType}
                    </span>
                </div>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                    {data.stats.totalMonths} months of data · Deep dive analysis
                </p>
            </motion.div>

            {/* Stat Cards */}
            <motion.div variants={item} className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <StatCard label="Average" value={formatAmount(data.stats.average)} />
                <StatCard label="Min" value={formatAmount(data.stats.min)} />
                <StatCard label="Max" value={formatAmount(data.stats.max)} />
                <StatCard
                    label="Trend"
                    value={`${Math.abs(trendPct).toFixed(1)}%`}
                    icon={
                        trendPct > 5 ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : trendPct < -5 ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                        )
                    }
                />
            </motion.div>

            {/* Alerts */}
            {(overBudgetCount > 0 || anomalyCount > 0) && (
                <motion.div variants={item} className="flex flex-wrap gap-2">
                    {overBudgetCount > 0 && (
                        <div className="flex items-center gap-1.5 rounded-md border-2 border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            {overBudgetCount} month{overBudgetCount > 1 ? "s" : ""} over budget
                        </div>
                    )}
                    {anomalyCount > 0 && (
                        <div className="flex items-center gap-1.5 rounded-md border-2 border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            {anomalyCount} anomal{anomalyCount > 1 ? "ies" : "y"} detected
                        </div>
                    )}
                </motion.div>
            )}

            {/* Trend Line Chart */}
            <motion.div variants={item}>
                <div className="rounded-lg border-2 border-border bg-card p-4 md:p-5 shadow-[3px_3px_0px_0px] shadow-border/50">
                    <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                        Historical Trend
                    </h2>
                    {chartData.length > 0 ? (
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis dataKey="label" className="text-xs" />
                                    <YAxis
                                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                        className="text-xs"
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0]?.payload;
                                            return (
                                                <div className="rounded-lg border-2 border-border bg-card p-3 shadow-[3px_3px_0px_0px] shadow-border/50">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                                        {label}
                                                    </p>
                                                    <p className="text-sm font-mono font-bold">
                                                        {formatAmount(d.amount)}
                                                    </p>
                                                    {d.budget && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Budget: {formatAmount(d.budget)}
                                                        </p>
                                                    )}
                                                    {d.isAnomaly && (
                                                        <p className="text-xs text-amber-500 font-bold mt-0.5">
                                                            ⚠ Anomaly
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                    {data.budgetLimit && (
                                        <ReferenceLine
                                            y={data.budgetLimit}
                                            stroke="#EF4444"
                                            strokeDasharray="5 5"
                                            label={{
                                                value: `Budget: ${formatAmount(data.budgetLimit)}`,
                                                position: "insideTopRight",
                                                className: "text-[10px] fill-destructive font-mono",
                                            }}
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#F59E0B"
                                        strokeWidth={2.5}
                                        dot={(props: Record<string, unknown>) => {
                                            const { cx, cy, index } = props as {
                                                cx: number;
                                                cy: number;
                                                index: number;
                                            };
                                            const dp = data.dataPoints[index];
                                            if (!dp)
                                                return (
                                                    <circle cx={cx} cy={cy} r={4} fill="#F59E0B" />
                                                );
                                            if (dp.isAnomaly) {
                                                return (
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={6}
                                                        fill="#EF4444"
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                    />
                                                );
                                            }
                                            if (dp.budgetStatus === "over") {
                                                return (
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={5}
                                                        fill="#EF4444"
                                                        stroke="#EF4444"
                                                        strokeWidth={1}
                                                    />
                                                );
                                            }
                                            return <circle cx={cx} cy={cy} r={4} fill="#F59E0B" />;
                                        }}
                                        isAnimationActive={true}
                                        animationDuration={800}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground font-mono text-center py-8">
                            No historical data available.
                        </p>
                    )}
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Spending
                        </span>
                        {data.budgetLimit && (
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="h-0.5 w-4 bg-[#EF4444]"
                                    style={{ borderTop: "2px dashed #EF4444" }}
                                />{" "}
                                Budget
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />{" "}
                            Anomaly
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Budget Adherence Timeline */}
            {data.budgetLimit && (
                <motion.div variants={item}>
                    <div className="rounded-lg border-2 border-border bg-card p-4 md:p-5 shadow-[3px_3px_0px_0px] shadow-border/50">
                        <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                            Budget Adherence
                        </h2>
                        <div className="flex gap-1 flex-wrap">
                            {data.dataPoints.map((dp, i) => {
                                const colors: Record<string, string> = {
                                    under: "bg-green-500",
                                    "on-track": "bg-blue-500",
                                    warning: "bg-amber-500",
                                    over: "bg-destructive",
                                };
                                const color = dp.budgetStatus
                                    ? colors[dp.budgetStatus] || "bg-muted"
                                    : "bg-muted";
                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center gap-0.5"
                                        title={`${monthNumberToName(dp.month, "short")} ${dp.year}: ${formatAmount(dp.amount)} (${dp.budgetStatus || "no budget"})`}
                                    >
                                        <div
                                            className={`h-6 w-4 rounded-sm ${color} transition-all hover:scale-125`}
                                        />
                                        <span className="text-[8px] text-muted-foreground">
                                            {monthNumberToName(dp.month, "short")?.slice(0, 1)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-green-500" /> Under
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-blue-500" /> On Track
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-amber-500" /> Warning
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-destructive" /> Over
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

function StatCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border-2 border-border bg-card p-3 shadow-[2px_2px_0px_0px] shadow-border/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {label}
            </p>
            <div className="flex items-center gap-1.5">
                {icon}
                <p className="text-lg font-mono font-black">{value}</p>
            </div>
        </div>
    );
}
