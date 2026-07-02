"use client";

import { motion } from "motion/react";
import { Scissors, ShoppingBag, Eye, Award } from "lucide-react";

interface Recommendation {
    type: string;
    message: string;
    categoryName: string;
    amount?: number;
}

interface RecommendationsProps {
    recommendations: Recommendation[];
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

function getRecIcon(type: string) {
    switch (type) {
        case "cut_back":
            return <Scissors className="h-4 w-4 text-destructive" strokeWidth={2.5} />;
        case "room_to_spend":
            return <ShoppingBag className="h-4 w-4 text-amber-500" strokeWidth={2.5} />;
        case "watch_out":
            return <Eye className="h-4 w-4 text-orange-500" strokeWidth={2.5} />;
        case "great_job":
            return <Award className="h-4 w-4 text-green-500" strokeWidth={2.5} />;
        default:
            return <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />;
    }
}

function getRecBadgeColor(type: string): string {
    switch (type) {
        case "cut_back":
            return "bg-destructive/10 text-destructive border-destructive/30";
        case "room_to_spend":
            return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
        case "watch_out":
            return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
        case "great_job":
            return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30";
        default:
            return "bg-muted text-muted-foreground border-border";
    }
}

function getRecLabel(type: string): string {
    switch (type) {
        case "cut_back":
            return "CUT BACK";
        case "room_to_spend":
            return "ROOM TO SPEND";
        case "watch_out":
            return "WATCH OUT";
        case "great_job":
            return "GREAT JOB";
        default:
            return type.toUpperCase();
    }
}

export function Recommendations({ recommendations }: RecommendationsProps) {
    if (recommendations.length === 0) {
        return (
            <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Recommendations
                </h3>
                <p className="text-sm text-muted-foreground">No recommendations for this month.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Recommendations
            </h3>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {recommendations.map((rec, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        className="flex items-start gap-3 rounded-md border-2 border-border bg-background p-3"
                    >
                        <div className="mt-0.5">{getRecIcon(rec.type)}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className={`inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${getRecBadgeColor(rec.type)}`}
                                >
                                    {getRecLabel(rec.type)}
                                </span>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {rec.categoryName}
                                </span>
                            </div>
                            <p className="text-sm">{rec.message}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
