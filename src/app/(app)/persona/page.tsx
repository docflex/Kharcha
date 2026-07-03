"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAppStore } from "@/stores/app-store";
import { AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { monthNumberToName } from "@/lib/utils/dates";
import { PersonaCard } from "@/components/persona/persona-card";
import { InsightsList } from "@/components/persona/insights-list";
import { Recommendations } from "@/components/persona/recommendations";
import { usePageSize } from "@/hooks/use-page-size";
import { usePersona, usePersonaHistory } from "@/hooks/use-persona";
import type { HistoryEntry } from "@/hooks/use-persona";
import { usePageTour } from "@/hooks/use-page-tour";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function PersonaPage() {
    const { year, month, prevMonth, nextMonth, setYearMonth } = useAppStore();
    const { data = null, isLoading: queryLoading, error: personaError } = usePersona(year, month);
    const { data: history = [] } = usePersonaHistory();
    const error = personaError ? "Failed to load persona" : null;

    // Prevent hydration mismatch: persisted React Query cache may have data on
    // client while the server always sees isLoading=true. Start with loading
    // state on both sides, then switch after mount.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect
    const loading = !mounted || queryLoading;

    usePageTour("persona", !loading && data !== null);

    function navigateMonth(direction: -1 | 1) {
        if (direction === -1) prevMonth();
        else nextMonth();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                        Monthly Persona
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-mono">
                        Your spending personality and recommendations
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span className="font-mono font-bold text-sm min-w-[100px] text-center">
                        {monthNumberToName(month, "short")} {year}
                    </span>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {loading && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Persona card skeleton */}
                    <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-lg bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-40 rounded bg-muted" />
                                <div className="h-3 w-64 rounded bg-muted" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-md border-2 border-border p-3 space-y-2"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                                    <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Insights + Recommendations skeleton */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, col) => (
                            <div
                                key={col}
                                className="rounded-lg border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px] shadow-border/50 animate-pulse"
                                style={{ animationDelay: `${col * 150}ms` }}
                            >
                                <div className="h-4 w-28 rounded bg-muted mb-4" />
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, j) => (
                                        <div key={j} className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-md bg-muted shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-full rounded bg-muted" />
                                                <div className="h-3 w-3/4 rounded bg-muted" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 text-destructive">
                    <AlertCircle className="h-5 w-5" strokeWidth={2.5} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {!loading && !error && data && (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    <motion.div variants={item} data-tour="persona-card">
                        <PersonaCard persona={data.persona} metrics={data.metrics} />
                    </motion.div>

                    <div data-tour="persona-details" className="grid gap-6 md:grid-cols-2">
                        <motion.div variants={item}>
                            <InsightsList insights={data.insights} />
                        </motion.div>
                        <motion.div variants={item}>
                            <Recommendations recommendations={data.recommendations} />
                        </motion.div>
                    </div>

                    {history.length > 1 && (
                        <PersonaTimeline
                            history={history}
                            year={year}
                            month={month}
                            onSelect={(y, m) => {
                                setYearMonth(y, m);
                            }}
                        />
                    )}
                </motion.div>
            )}
        </div>
    );
}

/* ─── Paginated Persona Timeline ──────────────────────────────────────────── */

function PersonaTimeline({
    history,
    year,
    month,
    onSelect,
}: {
    history: HistoryEntry[];
    year: number;
    month: number;
    onSelect: (y: number, m: number) => void;
}) {
    // ~108px per card, overhead ~140px (heading + nav row + padding)
    const cardsPerPage = usePageSize(108, 600, 3, 12);
    const [tlPage, setTlPage] = useState(1);
    const totalPages = Math.ceil(history.length / cardsPerPage);
    const visible = history.slice((tlPage - 1) * cardsPerPage, tlPage * cardsPerPage);

    // Auto-jump to the page containing the active month
    useEffect(() => {
        const idx = history.findIndex((e) => e.year === year && e.month === month);
        if (idx >= 0) {
            const targetPage = Math.floor(idx / cardsPerPage) + 1;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (targetPage !== tlPage) setTlPage(targetPage);
        }
    }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <motion.div
            variants={item}
            className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Persona Timeline
                </h3>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <TimelineNavBtn
                            onClick={() => setTlPage(1)}
                            disabled={tlPage === 1}
                            aria-label="First page"
                        >
                            <ChevronsLeft className="h-3 w-3" />
                        </TimelineNavBtn>
                        <TimelineNavBtn
                            onClick={() => setTlPage(tlPage - 1)}
                            disabled={tlPage === 1}
                            aria-label="Previous"
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </TimelineNavBtn>
                        <span className="text-[10px] font-mono text-muted-foreground px-1">
                            {tlPage}/{totalPages}
                        </span>
                        <TimelineNavBtn
                            onClick={() => setTlPage(tlPage + 1)}
                            disabled={tlPage === totalPages}
                            aria-label="Next"
                        >
                            <ChevronRight className="h-3 w-3" />
                        </TimelineNavBtn>
                        <TimelineNavBtn
                            onClick={() => setTlPage(totalPages)}
                            disabled={tlPage === totalPages}
                            aria-label="Last page"
                        >
                            <ChevronsRight className="h-3 w-3" />
                        </TimelineNavBtn>
                    </div>
                )}
            </div>
            {/* Mobile: horizontal scroll strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 md:hidden scrollbar-none">
                {visible.map((entry) => {
                    const isActive = entry.year === year && entry.month === month;
                    return (
                        <button
                            key={`m-${entry.year}-${entry.month}`}
                            onClick={() => onSelect(entry.year, entry.month)}
                            className={`shrink-0 rounded-md border-2 p-3 text-center transition-all min-w-[90px] ${
                                isActive
                                    ? "border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_0px] shadow-amber-500/50"
                                    : "border-border bg-background hover:bg-accent shadow-[2px_2px_0px_0px] shadow-border/50"
                            }`}
                        >
                            <span className="text-2xl block">{entry.personaEmoji}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mt-1">
                                {(monthNumberToName(entry.month) ?? "").slice(0, 3)}{" "}
                                {entry.year.toString().slice(2)}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground block">
                                {entry.personaName.replace("The ", "")}
                            </span>
                            {entry.savingsRate !== null && (
                                <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                                    {Math.round(entry.savingsRate)}% saved
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {/* Desktop: grid layout with larger cards */}
            <div className="hidden md:grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {visible.map((entry) => {
                    const isActive = entry.year === year && entry.month === month;
                    return (
                        <button
                            key={`d-${entry.year}-${entry.month}`}
                            onClick={() => onSelect(entry.year, entry.month)}
                            className={`rounded-md border-2 p-3 text-center transition-all ${
                                isActive
                                    ? "border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_0px] shadow-amber-500/50"
                                    : "border-border bg-background hover:bg-accent shadow-[2px_2px_0px_0px] shadow-border/50"
                            }`}
                        >
                            <span className="text-2xl block">{entry.personaEmoji}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mt-1">
                                {(monthNumberToName(entry.month) ?? "").slice(0, 3)}{" "}
                                {entry.year.toString().slice(2)}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground block">
                                {entry.personaName.replace("The ", "")}
                            </span>
                            {entry.savingsRate !== null && (
                                <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                                    {Math.round(entry.savingsRate)}% saved
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}

function TimelineNavBtn({
    children,
    onClick,
    disabled,
    ...props
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-all ${
                disabled
                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                    : "border-border hover:bg-accent text-foreground shadow-[1px_1px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
            }`}
            {...props}
        >
            {children}
        </button>
    );
}
