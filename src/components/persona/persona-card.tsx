"use client";

import { motion } from "motion/react";
import { Wallet, TrendingDown, TrendingUp, Target, Minus } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface PersonaCardProps {
    persona: {
        name: string;
        emoji: string;
        description: string;
    };
    metrics: {
        totalSpend: number;
        totalIncome: number;
        savingsRate: number;
        momChangePct: number | null;
        overBudgetCount: number;
        underBudgetCount: number;
    };
}

export function PersonaCard({ persona, metrics }: PersonaCardProps) {
    const { format: formatAmount } = useCurrency();
    const momIcon =
        metrics.momChangePct === null ? (
            <Minus className="h-4 w-4" strokeWidth={2.5} />
        ) : metrics.momChangePct > 0 ? (
            <TrendingUp className="h-4 w-4 text-destructive" strokeWidth={2.5} />
        ) : (
            <TrendingDown className="h-4 w-4 text-green-500" strokeWidth={2.5} />
        );

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">{persona.emoji}</span>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">
                            {persona.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">
                            {persona.description}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <MetricTile
                    label="Total Spend"
                    value={formatAmount(metrics.totalSpend)}
                    icon={<Wallet className="h-4 w-4" strokeWidth={2.5} />}
                />
                <MetricTile
                    label="Savings Rate"
                    value={`${metrics.savingsRate.toFixed(1)}%`}
                    icon={<Target className="h-4 w-4" strokeWidth={2.5} />}
                    variant={
                        metrics.savingsRate > 20
                            ? "positive"
                            : metrics.savingsRate < 0
                              ? "negative"
                              : "default"
                    }
                />
                <MetricTile
                    label="MoM Change"
                    value={
                        metrics.momChangePct !== null
                            ? `${metrics.momChangePct > 0 ? "+" : ""}${metrics.momChangePct.toFixed(1)}%`
                            : "—"
                    }
                    icon={momIcon}
                    variant={
                        metrics.momChangePct === null
                            ? "default"
                            : metrics.momChangePct > 10
                              ? "warning"
                              : metrics.momChangePct < -5
                                ? "positive"
                                : "default"
                    }
                />
                <MetricTile
                    label="Budget Status"
                    value={`${metrics.overBudgetCount} over / ${metrics.underBudgetCount} under`}
                    icon={<Target className="h-4 w-4" strokeWidth={2.5} />}
                    variant={metrics.overBudgetCount > 0 ? "negative" : "default"}
                />
            </div>
        </motion.div>
    );
}

function MetricTile({
    label,
    value,
    icon,
    variant = "default",
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    variant?: "default" | "positive" | "negative" | "warning";
}) {
    const styles = {
        default: "border-border bg-background",
        positive: "border-green-500/50 bg-green-500/5",
        negative: "border-destructive/50 bg-destructive/5",
        warning: "border-amber-500/50 bg-amber-500/5",
    };

    return (
        <div
            className={`rounded-md border-2 ${styles[variant]} p-3 flex flex-col gap-1 min-h-[72px]`}
        >
            <div className="flex items-center gap-1.5 text-muted-foreground">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <span className="font-mono text-sm font-bold">{value}</span>
        </div>
    );
}
