"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    TrendingDown,
    TrendingUp,
    Lightbulb,
    PiggyBank,
    Flame,
    Target,
    type LucideIcon,
} from "lucide-react";

interface Insight {
    icon: LucideIcon;
    text: string;
    color: string;
}

interface InsightsCarouselProps {
    totalExpenses: number;
    totalIncome: number;
    savingsRate: number;
    momChange: number | null;
    topCategory?: { categoryName: string; amount: number } | null;
    overBudgetCount: number;
    formatAmount: (n: number) => string;
}

export function InsightsCarousel({
    totalExpenses,
    totalIncome,
    savingsRate,
    momChange,
    topCategory,
    overBudgetCount,
    formatAmount,
}: InsightsCarouselProps) {
    const insights = useMemo(() => {
        const list: Insight[] = [];

        // Savings insight
        if (totalIncome > 0) {
            if (savingsRate >= 30) {
                list.push({
                    icon: PiggyBank,
                    text: `Saving ${savingsRate.toFixed(0)}% of income — excellent discipline!`,
                    color: "text-green-500",
                });
            } else if (savingsRate >= 10) {
                list.push({
                    icon: PiggyBank,
                    text: `Saving ${savingsRate.toFixed(0)}% — aim for 30% to build a strong buffer`,
                    color: "text-primary",
                });
            } else if (savingsRate >= 0) {
                list.push({
                    icon: PiggyBank,
                    text: `Only saving ${savingsRate.toFixed(0)}% — try cutting discretionary spend`,
                    color: "text-amber-500",
                });
            } else {
                list.push({
                    icon: Flame,
                    text: `Spending ${formatAmount(Math.abs(totalIncome - totalExpenses))} more than income!`,
                    color: "text-destructive",
                });
            }
        }

        // MoM insight
        if (momChange !== null) {
            if (momChange < -10) {
                list.push({
                    icon: TrendingDown,
                    text: `Spending down ${Math.abs(momChange).toFixed(0)}% vs last month — great trend!`,
                    color: "text-green-500",
                });
            } else if (momChange > 10) {
                list.push({
                    icon: TrendingUp,
                    text: `Spending up ${momChange.toFixed(0)}% vs last month — keep an eye on it`,
                    color: "text-amber-500",
                });
            } else {
                list.push({
                    icon: Target,
                    text: `Spending is stable (${momChange > 0 ? "+" : ""}${momChange.toFixed(0)}%) — consistency is key`,
                    color: "text-primary",
                });
            }
        }

        // Top category
        if (topCategory && totalExpenses > 0) {
            const pct = ((topCategory.amount / totalExpenses) * 100).toFixed(0);
            list.push({
                icon: Lightbulb,
                text: `${topCategory.categoryName} is your biggest spend at ${pct}% (${formatAmount(topCategory.amount)})`,
                color: "text-purple-400",
            });
        }

        // Budget alerts
        if (overBudgetCount > 0) {
            list.push({
                icon: Flame,
                text: `${overBudgetCount} ${overBudgetCount === 1 ? "category" : "categories"} over budget — review spending`,
                color: "text-destructive",
            });
        }

        // Income insight
        if (totalIncome > 0 && totalExpenses > 0) {
            const daysLeft =
                new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() -
                new Date().getDate();
            if (daysLeft > 0) {
                const remaining = totalIncome - totalExpenses;
                if (remaining > 0) {
                    const dailyBudget = remaining / daysLeft;
                    list.push({
                        icon: Target,
                        text: `${formatAmount(dailyBudget)}/day budget remaining for ${daysLeft} days`,
                        color: "text-blue-400",
                    });
                }
            }
        }

        // Fallback
        if (list.length === 0) {
            list.push({
                icon: Lightbulb,
                text: "Start tracking expenses to unlock spending insights",
                color: "text-muted-foreground",
            });
        }

        return list;
    }, [
        totalExpenses,
        totalIncome,
        savingsRate,
        momChange,
        topCategory,
        overBudgetCount,
        formatAmount,
    ]);

    const [index, setIndex] = useState(0);

    const next = useCallback(() => {
        setIndex((i) => (i + 1) % insights.length);
    }, [insights.length]);

    useEffect(() => {
        if (insights.length <= 1) return;
        const interval = setInterval(next, 5000);
        return () => clearInterval(interval);
    }, [next, insights.length]);

    return (
        <div className="relative h-8 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center gap-2"
                >
                    {(() => {
                        const Icon = insights[index].icon;
                        return (
                            <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${insights[index].color}`}
                                strokeWidth={2.5}
                            />
                        );
                    })()}
                    <span className="text-xs font-medium text-muted-foreground truncate">
                        {insights[index].text}
                    </span>
                    {insights.length > 1 && (
                        <div className="ml-auto flex gap-0.5 shrink-0">
                            {insights.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setIndex(i)}
                                    className={`h-1 rounded-full transition-all ${
                                        i === index
                                            ? "w-3 bg-primary"
                                            : "w-1 bg-muted-foreground/30"
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
