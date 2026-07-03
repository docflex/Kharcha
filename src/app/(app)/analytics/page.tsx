"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { motion, AnimatePresence } from "motion/react";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
    ReferenceArea,
} from "recharts";
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Lightbulb,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { monthNumberToName, MONTH_SELECT_ITEMS } from "@/lib/utils/dates";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAnalytics, useTrends, useHeatmap, useYoY } from "@/hooks/use-analytics";
import { CategoryHeatmap } from "@/components/analytics/category-heatmap";
import { YoYChart } from "@/components/analytics/yoy-chart";
import { useChartDelta } from "@/hooks/use-chart-delta";
import { ChartDeltaOverlay } from "@/components/ui/chart-delta-overlay";
import { usePageTour } from "@/hooks/use-page-tour";

const CHART_COLORS = [
    "#F59E0B", // amber-500 (primary)
    "#D97706", // amber-600
    "#F97316", // orange-500
    "#EA580C", // orange-600
    "#DC2626", // red-600
    "#B45309", // amber-700
    "#92400E", // amber-800
    "#C2410C", // orange-700
    "#78350F", // amber-900
    "#7C2D12", // orange-900
    "#FBBF24", // amber-400
    "#FB923C", // orange-400
    "#FCA5A1", // red-300
    "#FDE68A", // amber-200
];

type TabKey = "breakdown" | "comparison" | "trends" | "heatmap" | "yoy";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/* ─── Shared Sub-Components ──────────────────────────────────────────────── */

function ChartCard({
    title,
    children,
    className = "",
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-lg border-2 border-border bg-card p-4 md:p-5 shadow-[3px_3px_0px_0px] shadow-border/50 ${className}`}
        >
            <h2 className="text-sm font-black uppercase tracking-widest mb-4">{title}</h2>
            {children}
        </div>
    );
}

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
}) {
    const { format: formatAmount } = useCurrency();
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border-2 border-border bg-card p-3 shadow-[3px_3px_0px_0px] shadow-border/50">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {label}
            </p>
            {payload.map((entry, idx: number) => (
                <p key={idx} className="text-sm font-mono font-bold" style={{ color: entry.color }}>
                    {entry.name}: {formatAmount(entry.value)}
                </p>
            ))}
        </div>
    );
}

function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
    return (
        <div
            className={`rounded-lg border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px] shadow-border/50`}
        >
            <div className="h-4 w-40 rounded bg-muted animate-pulse mb-4" />
            <div className={`${height} rounded bg-muted/50 animate-pulse`} />
        </div>
    );
}

function InsightCarousel({
    insights,
}: {
    insights: { text: string; variant: "positive" | "negative" | "neutral" }[];
}) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (insights.length <= 1) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % insights.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [insights.length]);

    const ins = insights[index];
    const icon =
        ins.variant === "positive" ? (
            <TrendingDown className="h-4 w-4 text-green-500 shrink-0" strokeWidth={2.5} />
        ) : ins.variant === "negative" ? (
            <TrendingUp className="h-4 w-4 text-destructive shrink-0" strokeWidth={2.5} />
        ) : (
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" strokeWidth={2.5} />
        );

    const bg =
        ins.variant === "positive"
            ? "bg-green-500/10 border-green-500/30"
            : ins.variant === "negative"
              ? "bg-destructive/10 border-destructive/30"
              : "bg-amber-500/10 border-amber-500/30";

    return (
        <div data-tour="analytics-insights" className="relative overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${bg}`}
                >
                    {icon}
                    <span className="flex-1">{ins.text}</span>
                    {insights.length > 1 && (
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {index + 1}/{insights.length}
                        </span>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function InsightCallout({
    icon,
    text,
    variant = "neutral",
}: {
    icon: React.ReactNode;
    text: string;
    variant?: "positive" | "negative" | "neutral";
}) {
    const bg =
        variant === "positive"
            ? "bg-green-500/10 border-green-500/30"
            : variant === "negative"
              ? "bg-destructive/10 border-destructive/30"
              : "bg-amber-500/10 border-amber-500/30";
    return (
        <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${bg}`}>
            {icon}
            <span>{text}</span>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
    const { format: formatAmount } = useCurrency();
    const now = new Date();
    const searchParams = useSearchParams();
    const { year, month, setYear, setMonth, setYearMonth } = useAppStore();
    const [activeTab, setActiveTab] = useState<TabKey>("breakdown");

    // Interactive drag-delta for charts
    const momDelta = useChartDelta();
    const trendsDelta = useChartDelta();

    // Sync from URL search params on mount (deep-link support)
    useEffect(() => {
        const yp = searchParams.get("year");
        const mp = searchParams.get("month");
        if (yp || mp) {
            setYearMonth(yp ? Number(yp) : year, mp ? Number(mp) : month);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const {
        data: data = null,
        isLoading: queryLoading,
        error: analyticsError,
    } = useAnalytics(year, month);
    const { data: trends = [] } = useTrends(year, month);
    const { data: heatmapData } = useHeatmap(year);
    const { data: yoyData } = useYoY(month);
    const error = analyticsError ? "Failed to load analytics" : null;

    // Prevent hydration mismatch from persisted React Query cache
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    const loading = !mounted || queryLoading;

    usePageTour("analytics", !loading);

    const currentYear = now.getFullYear();
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Prepare chart data
    const categories = data?.summary.categories.filter((c) => c.type === "expense") ?? [];
    const donutData = categories
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .map((c, i) => ({
            name: c.categoryName,
            value: c.amount,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
    const totalSpend = categories.reduce((sum, c) => sum + c.amount, 0);

    const barData = (data?.topCategories ?? []).slice(0, 8).map((c, i) => ({
        name: c.categoryName,
        fullName: c.categoryName,
        amount: c.amount,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    // MoM comparison data — A4: color-code by direction
    const momData = (data?.mom.categories ?? [])
        .filter((c) => c.currentAmount > 0 || c.previousAmount > 0)
        .sort((a, b) => b.currentAmount - a.currentAmount)
        .slice(0, 8)
        .map((c) => ({
            name: c.categoryName,
            current: c.currentAmount,
            previous: c.previousAmount,
            fillCurrent:
                c.currentAmount > c.previousAmount
                    ? "#EF4444"
                    : c.currentAmount < c.previousAmount
                      ? "#10B981"
                      : "#F59E0B",
        }));

    // Trend line data
    const topTrends = [...trends].sort((a, b) => b.averageAmount - a.averageAmount).slice(0, 5);
    const trendLineData =
        topTrends.length > 0
            ? topTrends[0].dataPoints.map((dp, i) => {
                  const point: Record<string, number | string> = {
                      label: `${monthNumberToName(dp.month, "short")}`,
                  };
                  topTrends.forEach((t) => {
                      point[t.categoryName] = t.dataPoints[i]?.amount ?? 0;
                  });
                  return point;
              })
            : [];

    const hasData = categories.length > 0;

    // A5: Auto-generate insight callouts
    const insights: { text: string; variant: "positive" | "negative" | "neutral" }[] = [];
    if (data) {
        const topCat = barData[0];
        if (topCat) {
            const pct = totalSpend > 0 ? Math.round((topCat.amount / totalSpend) * 100) : 0;
            insights.push({
                text: `${topCat.name} is your top expense at ${pct}% of total spending`,
                variant: "neutral",
            });
        }
        if (data.mom.totalPercentChange !== null) {
            const pct = Math.round(data.mom.totalPercentChange);
            if (pct > 10) {
                insights.push({
                    text: `Overall spending is up ${pct}% vs last month`,
                    variant: "negative",
                });
            } else if (pct < -10) {
                insights.push({
                    text: `Overall spending is down ${Math.abs(pct)}% vs last month — nice!`,
                    variant: "positive",
                });
            }
        }
        if (data.savings.savingsRate > 30) {
            insights.push({
                text: `Saving ${Math.round(data.savings.savingsRate)}% of income this month`,
                variant: "positive",
            });
        } else if (data.savings.savingsRate < 0) {
            insights.push({
                text: `Spending exceeded income — negative savings this month`,
                variant: "negative",
            });
        }
    }

    // A9: Key for forcing chart re-animation on month/year change
    const chartKey = `${year}-${month}`;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            {/* Header */}
            <motion.div
                variants={item}
                className="flex items-center justify-between flex-wrap gap-3"
            >
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
                        Analytics
                    </h1>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                        Deep insights into your spending patterns
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (month === 1) {
                                setMonth(12);
                                setYear(year - 1);
                            } else setMonth(month - 1);
                        }}
                        className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <Select
                        value={String(month)}
                        onValueChange={(v) => v && setMonth(Number(v))}
                        items={MONTH_SELECT_ITEMS}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                    {monthNumberToName(m, "short")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(year)} onValueChange={(v) => v && setYear(Number(v))}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <button
                        onClick={() => {
                            if (month === 12) {
                                setMonth(1);
                                setYear(year + 1);
                            } else setMonth(month + 1);
                        }}
                        className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>
            </motion.div>

            {error && (
                <motion.div
                    variants={item}
                    className="flex items-center gap-2 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
                >
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* A10: Loading skeletons */}
            {loading && (
                <motion.div variants={item} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ChartSkeleton height="h-[280px]" />
                        <ChartSkeleton height="h-[300px]" />
                    </div>
                    <ChartSkeleton height="h-[300px]" />
                </motion.div>
            )}

            {!loading && !hasData && (
                <motion.div
                    variants={item}
                    className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50"
                >
                    <p className="text-sm text-muted-foreground font-mono">
                        No expense data for {monthNumberToName(month)} {year}. Add expenses to see
                        charts.
                    </p>
                </motion.div>
            )}

            {!loading && hasData && (
                <motion.div variants={item} className="space-y-5">
                    {/* A5: Insight carousel */}
                    {insights.length > 0 && <InsightCarousel insights={insights} />}

                    {/* A7: Tabbed layout — mobile swipeable via overflow-x-auto */}
                    <div
                        data-tour="analytics-tabs"
                        className="flex gap-1 overflow-x-auto border-b-2 border-border pb-0 scrollbar-none"
                    >
                        {(
                            [
                                { key: "breakdown", label: "Breakdown" },
                                { key: "comparison", label: "MoM" },
                                { key: "trends", label: "Trends" },
                                { key: "heatmap", label: "Heatmap" },
                                { key: "yoy", label: "YoY" },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap min-w-[80px] ${
                                    activeTab === tab.key
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                                {activeTab === tab.key && (
                                    <motion.div
                                        layoutId="analytics-tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500"
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30,
                                        }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <AnimatePresence mode="wait">
                        {activeTab === "breakdown" && (
                            <motion.div
                                key="breakdown"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="grid gap-3 md:gap-4 md:grid-cols-2"
                            >
                                {/* A3: Donut with total in center + compact legend */}
                                <ChartCard
                                    title={`Breakdown — ${monthNumberToName(month, "short")} ${year}`}
                                >
                                    <p className="md:hidden -mt-3 mb-2 text-xs font-mono font-bold text-muted-foreground">
                                        Total: {formatAmount(totalSpend)}
                                    </p>
                                    <div className="flex flex-row gap-2 md:gap-4">
                                        <div className="h-[120px] md:h-[240px] w-[120px] md:w-1/2 shrink-0 relative">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                                key={chartKey}
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={donutData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={30}
                                                        outerRadius={55}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        isAnimationActive={true}
                                                        animationDuration={600}
                                                    >
                                                        {donutData.map((entry, idx) => (
                                                            <Cell key={idx} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload?.length)
                                                                return null;
                                                            const d = payload[0];
                                                            return (
                                                                <div className="rounded-lg border-2 border-border bg-card p-3 shadow-[3px_3px_0px_0px] shadow-border/50">
                                                                    <p className="text-sm font-bold">
                                                                        {d.name}
                                                                    </p>
                                                                    <p className="text-sm font-mono font-bold">
                                                                        {formatAmount(
                                                                            d.value as number
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            {/* Total in donut center — desktop only */}
                                            <div className="absolute inset-0 hidden md:flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">
                                                    Total
                                                </span>
                                                <span className="text-[11px] font-mono font-black leading-tight">
                                                    {formatAmount(totalSpend)}
                                                </span>
                                            </div>
                                        </div>
                                        {/* A3: Side legend with larger swatches + amounts */}
                                        <div className="flex flex-col gap-0.5 md:gap-1.5 justify-center flex-1 min-w-0 overflow-x-auto">
                                            {donutData.slice(0, 10).map((d) => {
                                                const pct =
                                                    totalSpend > 0
                                                        ? Math.round((d.value / totalSpend) * 100)
                                                        : 0;
                                                return (
                                                    <div
                                                        key={d.name}
                                                        className="flex items-center gap-2 min-w-0"
                                                    >
                                                        <span
                                                            className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-sm border shrink-0"
                                                            style={{
                                                                backgroundColor: d.color,
                                                            }}
                                                        />
                                                        <span className="text-[11px] md:text-xs truncate flex-1">
                                                            {d.name}
                                                        </span>
                                                        <span className="text-[11px] md:text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                            {formatAmount(d.value)} ({pct}%)
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </ChartCard>

                                {/* A1: Full category names — wider YAxis + tooltip */}
                                <ChartCard title="Top Categories by Amount">
                                    <div className="h-[200px] md:h-[300px]">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                            key={chartKey}
                                        >
                                            <BarChart data={barData} layout="vertical">
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    className="opacity-30"
                                                />
                                                <XAxis
                                                    type="number"
                                                    tickFormatter={(v) =>
                                                        `₹${(v / 1000).toFixed(0)}k`
                                                    }
                                                    className="text-xs"
                                                />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={110}
                                                    className="text-xs"
                                                    tick={{
                                                        fontSize: 11,
                                                    }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar
                                                    dataKey="amount"
                                                    name="Amount"
                                                    radius={[0, 4, 4, 0]}
                                                    isAnimationActive={true}
                                                    animationDuration={600}
                                                >
                                                    {barData.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>
                            </motion.div>
                        )}

                        {activeTab === "comparison" && (
                            <motion.div
                                key="comparison"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {momData.length > 0 ? (
                                    <ChartCard title="Month-over-Month Comparison">
                                        <div className="h-[350px] relative select-none">
                                            {(() => {
                                                const momDeltaInfo = momDelta.computeDelta(
                                                    momData as Record<string, number | string>[],
                                                    ["current", "previous"]
                                                );
                                                return (
                                                    (momDelta.delta.showing ||
                                                        momDelta.delta.dragging) &&
                                                    momDeltaInfo && (
                                                        <ChartDeltaOverlay
                                                            startLabel={momDeltaInfo.startLabel}
                                                            endLabel={momDeltaInfo.endLabel}
                                                            deltas={momDeltaInfo.deltas}
                                                            formatValue={formatAmount}
                                                            onClear={momDelta.clear}
                                                        />
                                                    )
                                                );
                                            })()}
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                                key={chartKey}
                                            >
                                                <BarChart
                                                    data={momData}
                                                    onMouseDown={momDelta.onMouseDown}
                                                    onMouseMove={momDelta.onMouseMove}
                                                    onMouseUp={momDelta.onMouseUp}
                                                    onTouchStart={momDelta.onTouchStart}
                                                    onTouchMove={momDelta.onTouchMove}
                                                    onTouchEnd={momDelta.onTouchEnd}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        className="opacity-30"
                                                    />
                                                    <XAxis
                                                        dataKey="name"
                                                        className="text-xs"
                                                        tick={{ fontSize: 11 }}
                                                        interval={0}
                                                        angle={-20}
                                                        textAnchor="end"
                                                        height={50}
                                                    />
                                                    <YAxis
                                                        tickFormatter={(v) =>
                                                            `₹${(v / 1000).toFixed(0)}k`
                                                        }
                                                        className="text-xs"
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend />
                                                    {momDelta.delta.startIdx != null &&
                                                        momDelta.delta.endIdx != null && (
                                                            <ReferenceArea
                                                                x1={
                                                                    momData[
                                                                        Math.min(
                                                                            momDelta.delta.startIdx,
                                                                            momDelta.delta.endIdx
                                                                        )
                                                                    ]?.name
                                                                }
                                                                x2={
                                                                    momData[
                                                                        Math.max(
                                                                            momDelta.delta.startIdx,
                                                                            momDelta.delta.endIdx
                                                                        )
                                                                    ]?.name
                                                                }
                                                                fill="hsl(var(--primary))"
                                                                fillOpacity={0.1}
                                                                strokeOpacity={0.3}
                                                            />
                                                        )}
                                                    <Bar
                                                        dataKey="previous"
                                                        name="Previous Month"
                                                        fill="#94A3B8"
                                                        radius={[4, 4, 0, 0]}
                                                        isAnimationActive={true}
                                                        animationDuration={600}
                                                    />
                                                    {/* A4: Color-coded current month bars */}
                                                    <Bar
                                                        dataKey="current"
                                                        name="Current Month"
                                                        radius={[4, 4, 0, 0]}
                                                        isAnimationActive={true}
                                                        animationDuration={600}
                                                    >
                                                        {momData.map((entry, idx) => (
                                                            <Cell
                                                                key={idx}
                                                                fill={entry.fillCurrent}
                                                            />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* A4: Color legend for MoM */}
                                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />{" "}
                                                Increased
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />{" "}
                                                Decreased
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" />{" "}
                                                Unchanged
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-[#94A3B8]" />{" "}
                                                Previous
                                            </span>
                                        </div>
                                    </ChartCard>
                                ) : (
                                    <div className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50">
                                        <p className="text-sm text-muted-foreground font-mono">
                                            No comparison data — need at least 2 months of expenses.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === "trends" && (
                            <motion.div
                                key="trends"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {trendLineData.length > 1 ? (
                                    <ChartCard title="6-Month Category Trends">
                                        <div className="h-[350px] relative select-none">
                                            {(() => {
                                                const trendsDeltaInfo = trendsDelta.computeDelta(
                                                    trendLineData as Record<
                                                        string,
                                                        number | string
                                                    >[],
                                                    topTrends.map((t) => t.categoryName)
                                                );
                                                return (
                                                    (trendsDelta.delta.showing ||
                                                        trendsDelta.delta.dragging) &&
                                                    trendsDeltaInfo && (
                                                        <ChartDeltaOverlay
                                                            startLabel={trendsDeltaInfo.startLabel}
                                                            endLabel={trendsDeltaInfo.endLabel}
                                                            deltas={trendsDeltaInfo.deltas}
                                                            formatValue={formatAmount}
                                                            onClear={trendsDelta.clear}
                                                        />
                                                    )
                                                );
                                            })()}
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                                key={chartKey}
                                            >
                                                <LineChart
                                                    data={trendLineData}
                                                    onMouseDown={trendsDelta.onMouseDown}
                                                    onMouseMove={trendsDelta.onMouseMove}
                                                    onMouseUp={trendsDelta.onMouseUp}
                                                    onTouchStart={trendsDelta.onTouchStart}
                                                    onTouchMove={trendsDelta.onTouchMove}
                                                    onTouchEnd={trendsDelta.onTouchEnd}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        className="opacity-30"
                                                    />
                                                    <XAxis dataKey="label" className="text-xs" />
                                                    <YAxis
                                                        tickFormatter={(v) =>
                                                            `₹${(v / 1000).toFixed(0)}k`
                                                        }
                                                        className="text-xs"
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend />
                                                    {trendsDelta.delta.startIdx != null &&
                                                        trendsDelta.delta.endIdx != null && (
                                                            <ReferenceArea
                                                                x1={
                                                                    (
                                                                        trendLineData[
                                                                            Math.min(
                                                                                trendsDelta.delta
                                                                                    .startIdx,
                                                                                trendsDelta.delta
                                                                                    .endIdx
                                                                            )
                                                                        ] as Record<
                                                                            string,
                                                                            string | number
                                                                        >
                                                                    )?.label as string
                                                                }
                                                                x2={
                                                                    (
                                                                        trendLineData[
                                                                            Math.max(
                                                                                trendsDelta.delta
                                                                                    .startIdx,
                                                                                trendsDelta.delta
                                                                                    .endIdx
                                                                            )
                                                                        ] as Record<
                                                                            string,
                                                                            string | number
                                                                        >
                                                                    )?.label as string
                                                                }
                                                                fill="hsl(var(--primary))"
                                                                fillOpacity={0.1}
                                                                strokeOpacity={0.3}
                                                            />
                                                        )}
                                                    {topTrends.map((t, i) => (
                                                        <Line
                                                            key={t.categoryId}
                                                            type="monotone"
                                                            dataKey={t.categoryName}
                                                            stroke={
                                                                CHART_COLORS[
                                                                    i % CHART_COLORS.length
                                                                ]
                                                            }
                                                            strokeWidth={2}
                                                            dot={{ r: 4 }}
                                                            isAnimationActive={true}
                                                            animationDuration={800}
                                                        />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* Scrollable legend pills for mobile */}
                                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 md:hidden scrollbar-none">
                                            {topTrends.map((t, i) => (
                                                <span
                                                    key={t.categoryId}
                                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs"
                                                >
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                CHART_COLORS[
                                                                    i % CHART_COLORS.length
                                                                ],
                                                        }}
                                                    />
                                                    {t.categoryName}
                                                </span>
                                            ))}
                                        </div>
                                    </ChartCard>
                                ) : (
                                    <div className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50">
                                        <p className="text-sm text-muted-foreground font-mono">
                                            Not enough data for trends — need at least 2 months.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === "heatmap" && (
                            <motion.div
                                key="heatmap"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {heatmapData ? (
                                    <CategoryHeatmap data={heatmapData} />
                                ) : (
                                    <ChartSkeleton />
                                )}
                            </motion.div>
                        )}

                        {activeTab === "yoy" && (
                            <motion.div
                                key="yoy"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {yoyData ? <YoYChart data={yoyData} /> : <ChartSkeleton />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </motion.div>
    );
}
