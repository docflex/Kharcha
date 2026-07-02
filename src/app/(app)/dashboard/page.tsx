"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    TrendingDown,
    TrendingUp,
    Target,
    Upload,
    ArrowRight,
    Sparkles,
    AlertTriangle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useAppStore } from "@/stores/app-store";
import { monthNumberToName, MONTH_SELECT_ITEMS } from "@/lib/utils/dates";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { SpendingRing } from "@/components/dashboard/spending-ring";
import { InsightsCarousel } from "@/components/dashboard/insights-carousel";
import { Sparkline } from "@/components/dashboard/sparkline";
import { useAnalytics, useSparkline } from "@/hooks/use-analytics";
import { useProfile } from "@/hooks/use-profile";
import { usePageTour } from "@/hooks/use-page-tour";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function BentoCard({
    className = "",
    children,
    href,
}: {
    className?: string;
    children: React.ReactNode;
    href?: string;
}) {
    const card = (
        <motion.div
            variants={item}
            className={`rounded-lg border-2 border-border bg-card p-4 md:p-5 shadow-[3px_3px_0px_0px] shadow-border/50 hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all duration-200 min-w-0 overflow-hidden ${href ? "cursor-pointer" : ""} ${className}`}
        >
            {children}
        </motion.div>
    );

    if (href) {
        return (
            <Link href={href} className="block no-underline text-inherit">
                {card}
            </Link>
        );
    }

    return card;
}

function MoMBadge({ change }: { change: number | null }) {
    if (change === null) return <span className="font-mono">—</span>;
    const isUp = change > 0;
    const isDown = change < 0;
    const color = isDown ? "text-green-500" : isUp ? "text-destructive" : "text-muted-foreground";
    const arrow = isDown ? "↓" : isUp ? "↑" : "→";
    return (
        <span className={`text-xs font-mono font-bold ${color}`}>
            {arrow} {Math.abs(change).toFixed(1)}%
        </span>
    );
}

export default function DashboardPage() {
    const { format: formatAmount } = useCurrency();
    const { year, month, setYear, setMonth } = useAppStore();
    const now = new Date();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    const { data, isLoading: queryLoading, error: analyticsError } = useAnalytics(year, month);
    const { data: sparkData } = useSparkline(year, month);
    const { data: profile } = useProfile();

    // Investment toggle — persisted in localStorage
    const [includeInvestments, setIncludeInvestments] = useState(true);
    useEffect(() => {
        const stored = localStorage.getItem("kharcha:includeInvestments");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (stored !== null) setIncludeInvestments(stored === "true");
    }, []);
    const toggleInvestments = useCallback(() => {
        setIncludeInvestments((prev) => {
            const next = !prev;
            localStorage.setItem("kharcha:includeInvestments", String(next));
            return next;
        });
    }, []);

    // Treat as loading until mounted to avoid hydration mismatch from persisted cache
    const loading = !mounted || queryLoading;

    usePageTour("dashboard", !loading);

    const error = analyticsError ? "Failed to load dashboard data" : null;
    const userName = profile?.name ?? null;

    const currentYear = now.getFullYear();
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const totalExpenses = includeInvestments
        ? (data?.summary.totalSpend ?? 0)
        : (data?.summary.totalExpenses ?? 0);
    const totalIncome = data?.savings.totalIncome ?? 0;
    const savingsRate = data?.savings.savingsRate ?? 0;
    const momChange = data?.mom.totalPercentChange ?? null;
    const budgetOverview = data?.budgetOverview;
    const allTopCats = data?.topCategories ?? [];
    const topCats = includeInvestments
        ? allTopCats
        : allTopCats.filter((c) => c.type !== "investment");
    const overBudget = budgetOverview?.statuses.filter((s) => s.status === "over") ?? [];

    // Check if month has actual activity (expenses > 0)
    const hasActivity = totalExpenses > 0;
    // Check if income is actual (from monthly_income table) vs default fallback
    const currentMonthSparkIncome = sparkData?.income?.[sparkData.income.length - 1] ?? 0;
    const isActualIncome =
        sparkData !== null && year === now.getFullYear() && month === now.getMonth() + 1
            ? currentMonthSparkIncome > 0
            : true; // For past months, assume it's actual

    // Query string for deep-linking to the selected month
    const qs = `year=${year}&month=${month}`;

    // Time-of-day greeting
    const hour = new Date().getHours();
    const greeting =
        hour < 5
            ? { text: "Burning midnight oil", emoji: "🌙" }
            : hour < 12
              ? { text: "Good morning", emoji: "☀️" }
              : hour < 17
                ? { text: "Good afternoon", emoji: "🌤️" }
                : hour < 21
                  ? { text: "Good evening", emoji: "🌅" }
                  : { text: "Winding down", emoji: "🌙" };

    // Stable formatter for AnimatedCounter
    const stableFormat = useCallback(
        (n: number) => formatAmount(n),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [formatAmount]
    );

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Header with greeting + month selector */}
            <motion.div
                variants={item}
                className="flex items-center justify-between flex-wrap gap-3"
            >
                <div>
                    <h1 className="text-2xl font-black tracking-tight uppercase md:text-4xl">
                        {greeting.emoji} {greeting.text}
                        {userName ? `, ${userName.split(" ")[0]}` : ""}
                    </h1>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                        {monthNumberToName(month)} {year} · spending overview
                    </p>
                </div>
                <div data-tour="month-selector" className="flex items-center gap-2">
                    <button
                        onClick={toggleInvestments}
                        title={
                            includeInvestments
                                ? "Investments included — click to exclude"
                                : "Investments excluded — click to include"
                        }
                        className={`rounded-md border-2 p-2 transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                            includeInvestments
                                ? "border-border bg-background hover:bg-accent"
                                : "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                        }`}
                    >
                        {includeInvestments ? (
                            <Eye className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                            <EyeOff className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
                        )}
                    </button>
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
                    className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
                >
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* Insights Carousel — only when month has activity */}
            {!loading && hasActivity && (
                <motion.div
                    variants={item}
                    className="rounded-lg border-2 border-border bg-card px-4 py-2.5"
                >
                    <InsightsCarousel
                        totalExpenses={totalExpenses}
                        totalIncome={isActualIncome ? totalIncome : 0}
                        savingsRate={isActualIncome ? savingsRate : 0}
                        momChange={momChange}
                        topCategory={topCats[0] ?? null}
                        overBudgetCount={overBudget.length}
                        formatAmount={formatAmount}
                    />
                </motion.div>
            )}

            {/* Bento Grid */}
            <div data-tour="bento-grid" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {/* Total Expenses */}
                <BentoCard className="col-span-2 md:col-span-1" href={`/expenses?${qs}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Expenses
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 border border-destructive/20">
                            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                        </div>
                    </div>
                    <p className="text-xl font-black font-mono tracking-tight md:text-2xl truncate">
                        <AnimatedCounter
                            value={loading ? 0 : totalExpenses}
                            formatter={stableFormat}
                        />
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                            {loading ? (
                                ""
                            ) : hasActivity ? (
                                <MoMBadge change={momChange} />
                            ) : (
                                "No activity"
                            )}
                        </span>
                        {sparkData?.expenses && (
                            <span data-tour="sparkline">
                                <Sparkline
                                    data={sparkData.expenses}
                                    labels={sparkData.months.map((m) => {
                                        const [y, mo] = m.split("-");
                                        return `${monthNumberToName(Number(mo), "short")} ${y}`;
                                    })}
                                    formatter={formatAmount}
                                    color="var(--color-destructive)"
                                    width={60}
                                    height={20}
                                />
                            </span>
                        )}
                    </div>
                </BentoCard>

                {/* Income */}
                <BentoCard href={`/settings/income?${qs}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Income
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 border border-green-500/20">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        </div>
                    </div>
                    <p className="text-lg font-black font-mono tracking-tight md:text-2xl truncate">
                        <AnimatedCounter
                            value={loading ? 0 : totalIncome}
                            formatter={stableFormat}
                        />
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                            {totalIncome === 0
                                ? "Set in settings"
                                : isActualIncome
                                  ? "Monthly"
                                  : "Expected"}
                        </span>
                        {sparkData?.income && (
                            <Sparkline
                                data={sparkData.income}
                                labels={sparkData.months.map((m) => {
                                    const [y, mo] = m.split("-");
                                    return `${monthNumberToName(Number(mo), "short")} ${y}`;
                                })}
                                formatter={formatAmount}
                                color="var(--color-green-500, #22c55e)"
                                width={60}
                                height={20}
                            />
                        )}
                    </div>
                </BentoCard>

                {/* Spending Pulse Ring */}
                <BentoCard href={`/analytics?${qs}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Pulse
                        </span>
                    </div>
                    <div className="flex items-center justify-center">
                        {loading ? (
                            <div className="h-[80px] w-[80px] rounded-full border-4 border-muted animate-pulse" />
                        ) : (
                            <SpendingRing
                                spent={totalExpenses}
                                income={isActualIncome ? totalIncome : 0}
                                size={80}
                            />
                        )}
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground mt-1.5 font-mono truncate">
                        {!hasActivity
                            ? "No spending yet"
                            : !isActualIncome
                              ? "Income pending"
                              : totalIncome > 0
                                ? formatAmount(data?.savings.savings ?? 0) + " saved"
                                : "Add income first"}
                    </p>
                </BentoCard>

                {/* Quick Actions — only show when no expenses yet */}
                {!hasActivity && (
                    <BentoCard className="col-span-2 bg-primary text-primary-foreground border-foreground shadow-foreground">
                        <div className="flex items-center gap-2 mb-3">
                            <Upload className="h-4 w-4" strokeWidth={2.5} />
                            <span className="text-xs font-black uppercase tracking-widest">
                                Quick Upload
                            </span>
                        </div>
                        <p className="text-sm font-bold mb-4 opacity-90">
                            Drop Buddy screenshots here to extract expenses automatically
                        </p>
                        <Link
                            href="/upload"
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary-foreground text-primary px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-primary-foreground hover:bg-primary-foreground/90 transition-colors"
                        >
                            Upload Now
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </BentoCard>
                )}

                {/* Budget Status */}
                <BentoCard href="/settings/budgets">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Budgets
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20">
                            <Target className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-lg font-black font-mono tracking-tight md:text-2xl">
                        {loading ? "..." : budgetOverview ? budgetOverview.statuses.length : 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {overBudget.length > 0
                            ? `${overBudget.length} over budget`
                            : "All on track"}
                    </p>
                </BentoCard>

                {/* Top Category */}
                <BentoCard href={`/analytics?${qs}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Top Spend
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 border border-purple-500/20">
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                    </div>
                    <p className="text-lg font-black tracking-tight truncate">
                        {loading ? (
                            "..."
                        ) : topCats[0] ? (
                            <span>{topCats[0].categoryName}</span>
                        ) : (
                            "—"
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {topCats[0] ? formatAmount(topCats[0].amount) : "No data"}
                    </p>
                </BentoCard>
            </div>

            {/* Budget Alerts */}
            {overBudget.length > 0 && (
                <BentoCard
                    className="!border-destructive/50 !bg-destructive/5"
                    href="/settings/budgets"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={2.5} />
                        <h2 className="text-sm font-black uppercase tracking-widest text-destructive">
                            Over Budget
                        </h2>
                    </div>
                    <div className="space-y-2">
                        {overBudget.map((b) => (
                            <div
                                key={b.categoryName}
                                className="flex items-center justify-between text-sm"
                            >
                                <span className="font-bold">{b.categoryName}</span>
                                <span className="font-mono text-destructive">
                                    {formatAmount(b.actual)} / {formatAmount(b.budgetLimit)}{" "}
                                    <span className="text-xs">({b.percentUsed.toFixed(0)}%)</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </BentoCard>
            )}

            {/* Top Categories Breakdown */}
            {topCats.length > 0 && (
                <BentoCard href={`/analytics?${qs}`}>
                    <h2 className="text-xs font-black uppercase tracking-widest mb-3">
                        Top Categories — {monthNumberToName(month, "short")} {year}
                    </h2>
                    <div className="space-y-2">
                        {topCats.slice(0, 8).map((cat) => {
                            const pct =
                                totalExpenses > 0
                                    ? (cat.amount / (data?.summary.totalSpend ?? totalExpenses)) *
                                      100
                                    : 0;
                            return (
                                <div key={cat.categoryName} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold">{cat.categoryName}</span>
                                        <span className="font-mono font-bold">
                                            {formatAmount(cat.amount)}
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted border border-border overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-500"
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </BentoCard>
            )}

            {/* Getting Started (show only when no data) */}
            {!loading && totalExpenses === 0 && (
                <BentoCard className="!bg-muted/50">
                    <h2 className="text-sm font-black uppercase tracking-widest mb-3">
                        Getting Started
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                        {[
                            {
                                step: "01",
                                label: "Upload",
                                desc: "Scan Buddy screenshots",
                                href: "/upload",
                            },
                            {
                                step: "02",
                                label: "Expenses",
                                desc: "Add entries manually",
                                href: "/expenses",
                            },
                            {
                                step: "03",
                                label: "Budgets",
                                desc: "Set category limits",
                                href: "/settings/budgets",
                            },
                            {
                                step: "04",
                                label: "Analytics",
                                desc: "View spending trends",
                                href: "/analytics",
                            },
                        ].map((s) => (
                            <Link
                                key={s.step}
                                href={s.href}
                                className="flex items-start gap-3 rounded-md border-2 border-border bg-card p-3 hover:border-primary transition-colors group"
                            >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-black font-mono border border-primary/20">
                                    {s.step}
                                </span>
                                <div>
                                    <p className="text-sm font-bold group-hover:text-primary transition-colors">
                                        {s.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </BentoCard>
            )}
        </motion.div>
    );
}
