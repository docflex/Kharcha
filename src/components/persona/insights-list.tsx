"use client";

import { motion } from "motion/react";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    PlusCircle,
} from "lucide-react";

interface Insight {
    type: string;
    message: string;
    categoryName?: string;
    sentiment: "positive" | "negative" | "neutral";
}

interface InsightsListProps {
    insights: Insight[];
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function getInsightIcon(type: string, sentiment: string) {
    switch (type) {
        case "spending_increase":
            return <TrendingUp className="h-4 w-4 text-destructive" strokeWidth={2.5} />;
        case "spending_decrease":
            return <TrendingDown className="h-4 w-4 text-green-500" strokeWidth={2.5} />;
        case "over_budget":
            return <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={2.5} />;
        case "under_budget":
            return <CheckCircle2 className="h-4 w-4 text-green-500" strokeWidth={2.5} />;
        case "new_category":
            return <PlusCircle className="h-4 w-4 text-amber-500" strokeWidth={2.5} />;
        case "savings_trend":
            return sentiment === "positive" ? (
                <Sparkles className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
            ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={2.5} />
            );
        default:
            return <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />;
    }
}

function getSentimentBorder(sentiment: string): string {
    switch (sentiment) {
        case "positive":
            return "border-l-green-500";
        case "negative":
            return "border-l-destructive";
        default:
            return "border-l-amber-500";
    }
}

export function InsightsList({ insights }: InsightsListProps) {
    if (insights.length === 0) {
        return (
            <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Insights
                </h3>
                <p className="text-sm text-muted-foreground">
                    No insights available for this month yet.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Insights
            </h3>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {insights.map((insight, i) => {
                    const isCritical =
                        insight.type === "over_budget" ||
                        (insight.type === "savings_trend" && insight.sentiment === "negative");
                    return (
                        <motion.div
                            key={i}
                            variants={item}
                            className={`flex items-start gap-3 rounded-md border-2 border-border border-l-4 ${getSentimentBorder(insight.sentiment)} bg-background ${isCritical ? "p-4" : "p-3"}`}
                        >
                            <div className={isCritical ? "mt-0.5" : "mt-0.5"}>
                                {getInsightIcon(insight.type, insight.sentiment)}
                            </div>
                            <p className={isCritical ? "text-sm font-semibold" : "text-sm"}>
                                {insight.message}
                            </p>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}
