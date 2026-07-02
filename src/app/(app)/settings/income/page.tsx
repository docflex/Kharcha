"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Plus,
    Pencil,
    Trash2,
    FileText,
    IndianRupee,
    AlertCircle,
    Loader2,
    TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    Tooltip as RTooltip,
    XAxis,
    ReferenceArea,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { useCurrency } from "@/contexts/currency-context";
import { monthNumberToName, MONTH_SELECT_ITEMS } from "@/lib/utils/dates";
import { usePageSize } from "@/hooks/use-page-size";
import {
    useIncome,
    useCreateIncome,
    useUpdateIncome,
    useDeleteIncome,
    useUploadPaystub,
} from "@/hooks/use-income";
import type { IncomeEntry } from "@/hooks/use-income";
import { formatInputWithCommas, stripCommas } from "@/lib/utils/currency";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useChartDelta } from "@/hooks/use-chart-delta";
import { ChartDeltaOverlay } from "@/components/ui/chart-delta-overlay";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const SOURCE_LABELS: Record<string, string> = {
    salary: "💼 Salary",
    bonus: "🎉 Bonus",
    freelance: "💻 Freelance",
    side: "📦 Side Income",
    rental: "🏠 Rental",
    investment: "📈 Investment",
    other: "📝 Other",
};

function sourceLabel(source: string | null) {
    if (!source) return "Income";
    return SOURCE_LABELS[source.toLowerCase()] || source;
}

export default function IncomePage() {
    const { format: formatAmount, currency } = useCurrency();
    const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";
    const now = new Date();

    // Filters
    const [filterYear, setFilterYear] = useState<number | null>(null);
    const [filterSource, setFilterSource] = useState<string | null>(null);
    const currentYear = now.getFullYear();
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const {
        data: entries = [],
        isLoading: queryLoading,
        error: incomeError,
    } = useIncome(filterYear);
    const incomeDelta = useChartDelta();
    const displayError = incomeError ? "Failed to load income" : null;

    // Prevent hydration mismatch from persisted React Query cache
    const [mounted, setMounted] = useState(false);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => setMounted(true), []);
    /* eslint-enable react-hooks/set-state-in-effect */
    const loading = !mounted || queryLoading;

    // Dialogs
    const [addOpen, setAddOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
    const [addYear, setAddYear] = useState(currentYear);
    const [addMonth, setAddMonth] = useState(now.getMonth() + 1);
    const [addAmount, setAddAmount] = useState("");
    const [addSource, setAddSource] = useState("salary");

    // Upload zone collapse
    const [uploadExpanded, setUploadExpanded] = useState(false);

    const createIncome = useCreateIncome();
    const updateIncome = useUpdateIncome();
    const deleteIncome = useDeleteIncome();
    const uploadPaystub = useUploadPaystub();

    // PDF upload
    const [dragOver, setDragOver] = useState(false);

    function resetForm() {
        setAddYear(currentYear);
        setAddMonth(now.getMonth() + 1);
        setAddAmount("");
        setAddSource("salary");
    }

    async function handleAddManual() {
        const amount = parseFloat(stripCommas(addAmount));
        if (!amount || amount <= 0) return;

        try {
            await createIncome.mutateAsync({
                year: addYear,
                month: addMonth,
                amount,
                source: addSource,
            });
            setAddOpen(false);
            resetForm();
            toast.success("Income added");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to add income");
        }
    }

    const { confirm, dialog: confirmDialog } = useConfirmDialog();

    function handleEditSave() {
        if (!editEntry) return;
        const amount = parseFloat(stripCommas(addAmount));
        if (!amount || amount <= 0) return;

        confirm({
            title: "Update Income",
            description: "Save changes to this income entry?",
            confirmLabel: "Save",
            variant: "default",
            onConfirm: async () => {
                try {
                    await updateIncome.mutateAsync({
                        id: editEntry.id,
                        year: addYear,
                        month: addMonth,
                        amount,
                        source: addSource,
                    });
                    setEditEntry(null);
                    resetForm();
                    toast.success("Income updated");
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to update");
                }
            },
        });
    }

    function openEdit(entry: IncomeEntry) {
        setEditEntry(entry);
        setAddYear(entry.year);
        setAddMonth(entry.month);
        setAddAmount(entry.amount.toString());
        setAddSource(entry.source || "salary");
    }

    function handleDelete(id: string) {
        confirm({
            title: "Delete Income",
            description: "This income entry will be permanently removed.",
            confirmLabel: "Delete",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    await deleteIncome.mutateAsync(id);
                    toast.success("Income deleted");
                } catch {
                    toast.error("Failed to delete");
                }
            },
        });
    }

    async function handlePdfUpload(file: File) {
        if (!file.name.endsWith(".pdf")) {
            toast.error("Only PDF files are supported");
            return;
        }

        try {
            const result = await uploadPaystub.mutateAsync(file);
            const p = result.parsed;
            toast.success(
                `Parsed: ${sourceLabel(p.source)} for ${monthNumberToName(p.month, "short")} ${p.year}`
            );
        } catch {
            toast.error("Failed to upload paystub");
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handlePdfUpload(file);
    }

    function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handlePdfUpload(file);
        e.target.value = "";
    }

    // Sort entries by date descending and apply source filter
    const sortedEntries = useMemo(() => {
        const sorted = [...entries].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
        if (filterSource) {
            return sorted.filter((e) => e.source?.toLowerCase() === filterSource.toLowerCase());
        }
        return sorted;
    }, [entries, filterSource]);

    // Sparkline data (I2)
    const sparklineData = useMemo(() => {
        const byPeriod = new Map<string, number>();
        for (const e of entries) {
            const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
            byPeriod.set(key, (byPeriod.get(key) || 0) + e.amount);
        }
        return Array.from(byPeriod.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([period, amount]) => ({
                period: period
                    .split("-")
                    .map((p, i) => (i === 1 ? monthNumberToName(Number(p), "short") : p))
                    .reverse()
                    .join(" "),
                amount,
            }));
    }, [entries]);

    // Year grouping (I5) + yearly stats (I4)
    const yearGroups = useMemo(() => {
        const groups = new Map<number, typeof sortedEntries>();
        for (const e of sortedEntries) {
            const list = groups.get(e.year) || [];
            list.push(e);
            groups.set(e.year, list);
        }
        return Array.from(groups.entries())
            .sort(([a], [b]) => b - a)
            .map(([year, items]) => {
                const total = items.reduce((s, e) => s + e.amount, 0);
                const months = new Set(items.map((e) => e.month)).size;
                return { year, items, total, monthlyAvg: months > 0 ? total / months : 0 };
            });
    }, [sortedEntries]);

    // Pagination
    const [incomePage, setIncomePage] = useState(1);
    const entriesPerPage = usePageSize(48, 580);
    const totalIncomePages = Math.ceil(sortedEntries.length / entriesPerPage);
    const paginatedEntries = sortedEntries.slice(
        (incomePage - 1) * entriesPerPage,
        incomePage * entriesPerPage
    );

    // Get unique sources for filter
    const uniqueSources = useMemo(() => {
        const sources = new Set(entries.map((e) => e.source?.toLowerCase()).filter(Boolean));
        return Array.from(sources) as string[];
    }, [entries]);

    const dialogOpen = addOpen || editEntry !== null;
    const dialogMode = editEntry ? "edit" : "add";

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4 h-full"
        >
            {/* Header — compact */}
            <motion.div
                variants={item}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h1 className="text-2xl font-black tracking-tight uppercase md:text-3xl">
                        Income
                    </h1>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Salary, bonuses & side income
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Select
                        value={filterYear ? String(filterYear) : "all"}
                        onValueChange={(v) => {
                            setFilterYear(v === "all" ? null : Number(v));
                            setIncomePage(1);
                        }}
                        items={{
                            all: "All",
                            ...Object.fromEntries(
                                availableYears.map((y) => [String(y), String(y)])
                            ),
                        }}
                    >
                        <SelectTrigger className="h-8 text-xs w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableYears.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterSource || "all"}
                        onValueChange={(v) => {
                            setFilterSource(v === "all" ? null : v);
                            setIncomePage(1);
                        }}
                        items={{
                            all: "All Sources",
                            ...Object.fromEntries(uniqueSources.map((s) => [s, sourceLabel(s)])),
                        }}
                    >
                        <SelectTrigger className="h-8 text-xs w-[100px]">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sources</SelectItem>
                            {uniqueSources.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {sourceLabel(s)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        size="sm"
                        onClick={() => {
                            setEditEntry(null);
                            resetForm();
                            setAddOpen(true);
                        }}
                        className="gap-1 h-8 text-xs border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground hover:shadow-[3px_3px_0px_0px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add
                    </Button>
                </div>
            </motion.div>

            {/* Error */}
            {displayError && (
                <motion.div
                    variants={item}
                    className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive"
                >
                    <AlertCircle className="size-3.5 shrink-0" />
                    {displayError}
                </motion.div>
            )}

            {/* Row 1: Chart + Yearly Ribbon side by side */}
            <motion.div
                variants={item}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-stretch"
            >
                {/* Chart */}
                <div className="rounded-lg border-2 border-border p-3 shadow-[3px_3px_0px_0px] shadow-border/50">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            Income Trend
                        </span>
                    </div>
                    {sparklineData.length >= 2 ? (
                        <div className="h-20 relative select-none">
                            {(() => {
                                const deltaInfo = incomeDelta.computeDelta(
                                    sparklineData as Record<string, number | string>[],
                                    "amount"
                                );
                                return (
                                    (incomeDelta.delta.showing || incomeDelta.delta.dragging) &&
                                    deltaInfo && (
                                        <ChartDeltaOverlay
                                            startLabel={deltaInfo.startLabel}
                                            endLabel={deltaInfo.endLabel}
                                            deltas={deltaInfo.deltas}
                                            formatValue={formatAmount}
                                            onClear={incomeDelta.clear}
                                        />
                                    )
                                );
                            })()}
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={sparklineData}
                                    onMouseDown={incomeDelta.onMouseDown}
                                    onMouseMove={incomeDelta.onMouseMove}
                                    onMouseUp={incomeDelta.onMouseUp}
                                    onTouchStart={incomeDelta.onTouchStart}
                                    onTouchMove={incomeDelta.onTouchMove}
                                    onTouchEnd={incomeDelta.onTouchEnd}
                                >
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop
                                                offset="5%"
                                                stopColor="var(--primary)"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--primary)"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="period" hide />
                                    <RTooltip
                                        contentStyle={{
                                            background: "var(--popover)",
                                            border: "2px solid var(--border)",
                                            borderRadius: "8px",
                                            fontSize: "11px",
                                            fontFamily: "var(--font-mono)",
                                        }}
                                        formatter={(value: number) => [
                                            formatAmount(value),
                                            "Income",
                                        ]}
                                    />
                                    {incomeDelta.delta.startIdx != null &&
                                        incomeDelta.delta.endIdx != null && (
                                            <ReferenceArea
                                                x1={
                                                    sparklineData[
                                                        Math.min(
                                                            incomeDelta.delta.startIdx,
                                                            incomeDelta.delta.endIdx
                                                        )
                                                    ]?.period
                                                }
                                                x2={
                                                    sparklineData[
                                                        Math.max(
                                                            incomeDelta.delta.startIdx,
                                                            incomeDelta.delta.endIdx
                                                        )
                                                    ]?.period
                                                }
                                                fill="var(--primary)"
                                                fillOpacity={0.15}
                                                strokeOpacity={0}
                                            />
                                        )}
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="var(--primary)"
                                        strokeWidth={2}
                                        fill="url(#incomeGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-20 flex items-center justify-center text-xs text-muted-foreground font-mono">
                            Need 2+ months for trend
                        </div>
                    )}
                </div>

                {/* Yearly Stats (vertical stack on right) */}
                {yearGroups.length > 0 && (
                    <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-none">
                        {yearGroups.map((yg) => (
                            <div
                                key={yg.year}
                                className="flex-none rounded-lg border-2 border-border px-3 py-1.5 shadow-[3px_3px_0px_0px] shadow-border/50 min-w-[140px]"
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {yg.year}
                                </p>
                                <p className="text-sm font-black font-mono text-primary">
                                    {formatAmount(yg.total)}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                    Avg: {formatAmount(yg.monthlyAvg)}/mo
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Row 2: Upload bar — slim inline CTA */}
            <motion.div variants={item}>
                {uploadExpanded || uploadPaystub.isPending ? (
                    <label
                        htmlFor="paystub-upload"
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-all ${
                            dragOver
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                    >
                        {uploadPaystub.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                        ) : (
                            <FileText className="h-5 w-5 text-primary shrink-0" strokeWidth={2.5} />
                        )}
                        <div className="min-w-0">
                            <p className="text-xs font-bold">
                                {uploadPaystub.isPending
                                    ? "Parsing paystub..."
                                    : "Upload Paystub PDF"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                Drop PDF or click to browse · NET PAY extracted automatically
                            </p>
                        </div>
                        <input
                            id="paystub-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileInput}
                            className="hidden"
                            disabled={uploadPaystub.isPending}
                        />
                    </label>
                ) : (
                    <button
                        onClick={() => setUploadExpanded(true)}
                        className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-border px-3 py-2 text-left hover:border-primary/50 hover:bg-muted/50 transition-all"
                    >
                        <FileText className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                        <span className="text-xs font-bold">Upload Paystub PDF</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            · Auto-extract NET PAY from payslips
                        </span>
                    </button>
                )}
            </motion.div>

            {/* Row 3: Table — fills remaining space */}
            {loading ? (
                <motion.div variants={item} className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </motion.div>
            ) : sortedEntries.length === 0 ? (
                <motion.div
                    variants={item}
                    className="flex flex-col items-center gap-3 py-12 text-center"
                >
                    <IndianRupee className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                        No income entries yet. Upload a paystub or add manually.
                    </p>
                </motion.div>
            ) : (
                <>
                    {/* Desktop Compact Table */}
                    <motion.div
                        variants={item}
                        className="hidden md:block rounded-lg border-2 border-border shadow-[3px_3px_0px_0px] shadow-border/50 overflow-x-auto"
                    >
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="border-b-2">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-2">
                                        Period
                                    </TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-2">
                                        Source
                                    </TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right py-2">
                                        Amount
                                    </TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest w-[72px] py-2">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    let lastYear: number | null = null;
                                    return paginatedEntries.flatMap((entry) => {
                                        const rows: React.ReactNode[] = [];
                                        if (entry.year !== lastYear) {
                                            lastYear = entry.year;
                                            rows.push(
                                                <TableRow
                                                    key={`year-${entry.year}`}
                                                    className="bg-muted/30"
                                                >
                                                    <TableCell
                                                        colSpan={4}
                                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-1"
                                                    >
                                                        ── {entry.year} ──
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }
                                        rows.push(
                                            <TableRow
                                                key={entry.id}
                                                className="hover:bg-muted/30 transition-colors"
                                            >
                                                <TableCell className="font-mono text-muted-foreground py-1.5">
                                                    {monthNumberToName(entry.month, "short")}{" "}
                                                    {entry.year}
                                                </TableCell>
                                                <TableCell className="font-bold py-1.5">
                                                    {sourceLabel(entry.source)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-primary py-1.5">
                                                    {formatAmount(entry.amount)}
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <div className="flex items-center gap-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            onClick={() => openEdit(entry)}
                                                            aria-label="Edit income"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon-xs"
                                                            onClick={() => handleDelete(entry.id)}
                                                            aria-label="Delete income"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                        return rows;
                                    });
                                })()}
                            </TableBody>
                        </Table>

                        {/* Pagination + Total combined footer */}
                        <div className="flex items-center justify-between border-t-2 border-border bg-muted/50 px-3 py-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Total ({sortedEntries.length}) ·{" "}
                                <span className="text-sm text-primary font-mono">
                                    {formatAmount(sortedEntries.reduce((s, e) => s + e.amount, 0))}
                                </span>
                            </span>
                            <Pagination
                                page={incomePage}
                                totalPages={totalIncomePages}
                                onPageChange={setIncomePage}
                                totalItems={sortedEntries.length}
                                pageSize={entriesPerPage}
                            />
                        </div>
                    </motion.div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-2">
                        <AnimatePresence mode="popLayout">
                            {(() => {
                                let lastYear: number | null = null;
                                return paginatedEntries.flatMap((entry) => {
                                    const cards: React.ReactNode[] = [];
                                    if (entry.year !== lastYear) {
                                        lastYear = entry.year;
                                        cards.push(
                                            <div
                                                key={`year-m-${entry.year}`}
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-0.5"
                                            >
                                                ── {entry.year} ──
                                            </div>
                                        );
                                    }
                                    cards.push(
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -100 }}
                                            className="rounded-lg border-2 border-border bg-card p-3 shadow-[3px_3px_0px_0px] shadow-border/50"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {monthNumberToName(entry.month, "short")}{" "}
                                                        {entry.year}
                                                    </span>
                                                    <span className="mx-1.5 text-border">·</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] py-0"
                                                    >
                                                        {sourceLabel(entry.source)}
                                                    </Badge>
                                                </div>
                                                <p className="font-mono font-black text-primary text-sm shrink-0">
                                                    {formatAmount(entry.amount)}
                                                </p>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => openEdit(entry)}
                                                        aria-label="Edit income"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon-xs"
                                                        onClick={() => handleDelete(entry.id)}
                                                        aria-label="Delete income"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                    return cards;
                                });
                            })()}
                        </AnimatePresence>

                        {/* Mobile Pagination + Total */}
                        <div className="flex items-center justify-between rounded-lg border-2 border-border bg-muted/50 px-3 py-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Total ({sortedEntries.length}) ·{" "}
                                <span className="text-sm text-primary font-mono">
                                    {formatAmount(sortedEntries.reduce((s, e) => s + e.amount, 0))}
                                </span>
                            </span>
                            <Pagination
                                page={incomePage}
                                totalPages={totalIncomePages}
                                onPageChange={setIncomePage}
                                totalItems={sortedEntries.length}
                                pageSize={entriesPerPage}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Add/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setAddOpen(false);
                        setEditEntry(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent className="border-2 border-border shadow-[4px_4px_0px_0px] shadow-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase">
                            {dialogMode === "edit" ? "Edit Income" : "Add Income"}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogMode === "edit"
                                ? "Update this income entry."
                                : "Add salary, freelance, bonus, or any other income for a month."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-widest">
                                    Year
                                </Label>
                                <Select
                                    value={String(addYear)}
                                    onValueChange={(v) => setAddYear(Number(v))}
                                >
                                    <SelectTrigger className="mt-1.5">
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
                            </div>
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-widest">
                                    Month
                                </Label>
                                <Select
                                    value={String(addMonth)}
                                    onValueChange={(v) => setAddMonth(Number(v))}
                                    items={Object.fromEntries(
                                        Array.from({ length: 12 }, (_, i) => [
                                            String(i + 1),
                                            monthNumberToName(i + 1),
                                        ])
                                    )}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <SelectItem key={m} value={String(m)}>
                                                {monthNumberToName(m)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Source
                            </Label>
                            <Select
                                value={addSource}
                                onValueChange={(v) => v && setAddSource(v)}
                                items={{
                                    salary: "💼 Salary",
                                    bonus: "🎉 Bonus",
                                    freelance: "💻 Freelance",
                                    side: "📦 Side Income",
                                    rental: "🏠 Rental",
                                    investment: "📈 Investment",
                                    other: "📝 Other",
                                }}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="salary">💼 Salary</SelectItem>
                                    <SelectItem value="bonus">🎉 Bonus</SelectItem>
                                    <SelectItem value="freelance">💻 Freelance</SelectItem>
                                    <SelectItem value="side">📦 Side Income</SelectItem>
                                    <SelectItem value="rental">🏠 Rental</SelectItem>
                                    <SelectItem value="investment">📈 Investment</SelectItem>
                                    <SelectItem value="other">📝 Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Amount ({currencySymbol})
                            </Label>
                            <Input
                                type="text"
                                inputMode="decimal"
                                value={addAmount}
                                onChange={(e) =>
                                    setAddAmount(formatInputWithCommas(e.target.value, currency))
                                }
                                placeholder={currency === "INR" ? "1,36,204.33" : "136,204.33"}
                                className="mt-1.5 font-mono"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAddOpen(false);
                                setEditEntry(null);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={dialogMode === "edit" ? handleEditSave : handleAddManual}
                            disabled={
                                (dialogMode === "edit"
                                    ? updateIncome.isPending
                                    : createIncome.isPending) || !addAmount
                            }
                            className="gap-1.5 border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                        >
                            {(
                                dialogMode === "edit"
                                    ? updateIncome.isPending
                                    : createIncome.isPending
                            ) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : dialogMode === "edit" ? (
                                <Pencil className="h-4 w-4" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            {dialogMode === "edit" ? "Save" : "Add"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {confirmDialog}
        </motion.div>
    );
}
