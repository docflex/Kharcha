"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
    Plus,
    Trash2,
    Target,
    LayoutDashboard,
    Sparkles,
    ArrowRight,
    Lightbulb,
    TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useCurrency } from "@/contexts/currency-context";
import { useCategories, useCategoryStats } from "@/hooks/use-categories";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBudgets, useCreateBudget, useDeleteBudget } from "@/hooks/use-budgets";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/layout/loading-skeleton";
import { formatInputWithCommas, stripCommas } from "@/lib/utils/currency";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

interface BudgetRow {
    id: string;
    categoryId: string;
    monthlyLimit: number;
    effectiveFrom: string;
    effectiveUntil: string | null;
    categoryName: string;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function BudgetsPage() {
    const { format: formatAmount, currency } = useCurrency();
    const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";
    const { data: categories = [] } = useCategories();
    const { data: budgets = [], isLoading: queryLoading } = useBudgets();

    // Prevent hydration mismatch from persisted React Query cache
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    const loading = !mounted || queryLoading;
    const { data: stats = [] } = useCategoryStats();

    // Fetch current month analytics for accurate budget spending
    const { data: analytics } = useAnalytics(new Date().getFullYear(), new Date().getMonth() + 1);
    const budgetStatusMap = new Map(
        (analytics?.budgetOverview?.statuses ?? []).map((s) => [s.categoryName, s])
    );
    const [formOpen, setFormOpen] = useState(false);
    const [batchOpen, setBatchOpen] = useState(false);

    // Form state
    const [categoryId, setCategoryId] = useState("");
    const [monthlyLimit, setMonthlyLimit] = useState("");
    const [effectiveFrom, setEffectiveFrom] = useState(
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    );

    // Batch form state
    const [batchLimits, setBatchLimits] = useState<Record<string, string>>({});

    const createBudget = useCreateBudget();
    const deleteBudget = useDeleteBudget();

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const statsMap = new Map(stats.map((s) => [s.categoryId, s]));
    const rows: BudgetRow[] = budgets.map((b) => ({
        ...b,
        categoryName: categoryMap.get(b.categoryId) || "Unknown",
    }));

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!categoryId || !monthlyLimit) {
            toast.error("Category and limit are required");
            return;
        }
        try {
            await createBudget.mutateAsync({
                categoryId,
                monthlyLimit: parseFloat(stripCommas(monthlyLimit)),
                effectiveFrom,
            });
            toast.success(`Budget set for ${categoryMap.get(categoryId) ?? "category"}`);
            setFormOpen(false);
            setCategoryId("");
            setMonthlyLimit("");
        } catch (_e) {
            // Global onError handler shows toast
        }
    }

    const { confirm: confirmDelete, dialog: confirmDialog } = useConfirmDialog();

    function handleDelete(id: string, name: string) {
        confirmDelete({
            title: "Delete Budget",
            description: `Remove the budget for "${name}"? This cannot be undone.`,
            confirmLabel: "Delete",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    await deleteBudget.mutateAsync(id);
                    toast.success(`Budget for "${name}" deleted`);
                } catch (_e) {
                    // Global onError handler shows toast
                }
            },
        });
    }

    async function handleBatchSetup() {
        const entries = Object.entries(batchLimits).filter(
            ([, v]) => v && parseFloat(stripCommas(v)) > 0
        );
        if (entries.length === 0) {
            toast.error("Set at least one budget limit");
            return;
        }
        let created = 0;
        for (const [catId, limit] of entries) {
            try {
                await createBudget.mutateAsync({
                    categoryId: catId,
                    monthlyLimit: parseFloat(stripCommas(limit)),
                    effectiveFrom,
                });
                created++;
            } catch (_e) {
                // Skip failures, continue
            }
        }
        toast.success(`${created} budget${created !== 1 ? "s" : ""} created`);
        setBatchOpen(false);
        setBatchLimits({});
    }

    // Categories that don't already have a budget
    const availableCategories = categories.filter(
        (c) => !budgets.some((b) => b.categoryId === c.id)
    );

    // B2: Data-driven suggestions from category stats
    const suggestions = availableCategories
        .map((c) => {
            const stat = statsMap.get(c.id);
            if (!stat || stat.count === 0) return null;
            const avgMonthly = stat.totalAmount / Math.max(1, Math.ceil(stat.count / 3));
            const suggestedLimit = Math.ceil(avgMonthly / 1000) * 1000;
            return {
                category: c,
                avgSpend: stat.totalAmount / Math.max(1, stat.count),
                suggestedLimit: Math.max(suggestedLimit, 1000),
                entryCount: stat.count,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b!.entryCount - a!.entryCount)
        .slice(0, 5) as Array<{
        category: { id: string; name: string };
        avgSpend: number;
        suggestedLimit: number;
        entryCount: number;
    }>;

    // B6: Progress calculation helper
    function getProgressColor(percent: number) {
        if (percent > 100) return "bg-destructive";
        if (percent >= 80) return "bg-amber-500";
        return "bg-green-500";
    }

    function getProgressTextColor(percent: number) {
        if (percent > 100) return "text-destructive";
        if (percent >= 80) return "text-amber-500";
        return "text-green-500";
    }

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div
                variants={item}
                className="flex items-center justify-between flex-wrap gap-3"
            >
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
                        Budget Targets
                    </h1>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                        Set monthly spending limits per category
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {availableCategories.length > 1 && (
                        <Button
                            variant="outline"
                            onClick={() => setBatchOpen(true)}
                            className="font-bold gap-1.5"
                        >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                            Batch Setup
                        </Button>
                    )}
                    <Button
                        onClick={() => setFormOpen(true)}
                        className="font-bold gap-1.5"
                        disabled={availableCategories.length === 0}
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        Add Budget
                    </Button>
                </div>
            </motion.div>

            {/* B5: Cross-page links */}
            <motion.div variants={item} className="flex flex-wrap gap-3 text-xs">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                    <LayoutDashboard className="h-3 w-3" /> Dashboard alerts →
                </Link>
                <Link
                    href="/persona"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                    <Sparkles className="h-3 w-3" /> Persona insights →
                </Link>
                <Link
                    href="/analytics"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                    <TrendingUp className="h-3 w-3" /> Analytics →
                </Link>
            </motion.div>

            {loading && <CardSkeleton count={4} />}

            {/* B1: Rich empty state + B3: Ghost card */}
            {!loading && rows.length === 0 && (
                <>
                    <EmptyState
                        icon={Target}
                        title="No budgets set"
                        description="Budgets power your dashboard alerts, persona insights, and spending recommendations. Set limits to track how much you spend vs. plan."
                        actions={[
                            { label: "Add Budget", onClick: () => setFormOpen(true) },
                            ...(availableCategories.length > 1
                                ? [
                                      {
                                          label: "Batch Setup",
                                          onClick: () => setBatchOpen(true),
                                          variant: "outline" as const,
                                      },
                                  ]
                                : []),
                        ]}
                    />

                    {/* B3: Ghost preview card */}
                    <motion.div variants={item}>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Preview — what budget cards look like
                        </p>
                        <div className="rounded-lg border-2 border-dashed border-border/50 bg-card/50 p-4 shadow-[3px_3px_0px_0px] shadow-border/20 opacity-50">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm">Groceries</p>
                                    <p className="text-lg font-black font-mono">
                                        {formatAmount(8000)}{" "}
                                        <span className="text-xs text-muted-foreground font-normal">
                                            / {formatAmount(10000)}
                                        </span>
                                    </p>
                                    <div className="h-2 rounded-full bg-muted border border-border overflow-hidden mt-2">
                                        <div
                                            className="h-full rounded-full bg-green-500"
                                            style={{ width: "80%" }}
                                        />
                                    </div>
                                    <p className="text-xs text-green-500 font-mono font-bold mt-1">
                                        80% used
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}

            {/* B2: Data-driven suggestions */}
            {!loading && rows.length === 0 && suggestions.length > 0 && (
                <motion.div variants={item}>
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-primary" strokeWidth={2.5} />
                        <p className="text-xs font-bold uppercase tracking-widest">
                            Suggested Budgets
                        </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {suggestions.map((s) => (
                            <button
                                key={s.category.id}
                                onClick={() => {
                                    setCategoryId(s.category.id);
                                    setMonthlyLimit(
                                        formatInputWithCommas(String(s.suggestedLimit), currency)
                                    );
                                    setFormOpen(true);
                                }}
                                className="rounded-lg border-2 border-border bg-card p-3 text-left hover:border-primary transition-colors group shadow-[3px_3px_0px_0px] shadow-border/50"
                            >
                                <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                    {s.category.name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    avg {formatAmount(s.avgSpend)}/entry · {s.entryCount} entries
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-black font-mono text-primary">
                                        Set {formatAmount(s.suggestedLimit)}?
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* B6: Budget cards with progress bars */}
            {!loading && rows.length > 0 && (
                <motion.div variants={item} className="space-y-3">
                    {rows.map((budget) => {
                        const budgetStatus = budgetStatusMap.get(budget.categoryName);
                        const actual = budgetStatus?.actual ?? 0;
                        const percent = budgetStatus ? Math.round(budgetStatus.percentUsed) : 0;

                        return (
                            <div
                                key={budget.id}
                                className="rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50 group"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm">{budget.categoryName}</p>
                                        <p className="text-lg font-black font-mono">
                                            {formatAmount(budget.monthlyLimit)}
                                            <span className="text-xs text-muted-foreground font-normal ml-1">
                                                /month
                                            </span>
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="icon-sm"
                                        onClick={() => handleDelete(budget.id, budget.categoryName)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Delete budget"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {/* Progress bar */}
                                <div className="h-2 rounded-full bg-muted border border-border overflow-hidden mt-3">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percent)}`}
                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                    <span
                                        className={`text-xs font-mono font-bold ${getProgressTextColor(percent)}`}
                                    >
                                        {formatAmount(actual)} · {percent}% used
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        From {budget.effectiveFrom}
                                        {budget.effectiveUntil
                                            ? ` to ${budget.effectiveUntil}`
                                            : ""}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {/* Add Budget Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-wide">
                            Add Budget
                        </DialogTitle>
                        <DialogDescription>
                            Set a monthly spending limit for a category
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Category
                            </Label>
                            <Select
                                value={categoryId}
                                onValueChange={(v) => v && setCategoryId(v)}
                                items={Object.fromEntries(
                                    availableCategories.map((c) => [c.id, c.name])
                                )}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Monthly Limit ({currencySymbol})
                            </Label>
                            <Input
                                type="text"
                                inputMode="decimal"
                                placeholder={currency === "INR" ? "10,000" : "10,000"}
                                value={monthlyLimit}
                                onChange={(e) =>
                                    setMonthlyLimit(formatInputWithCommas(e.target.value, currency))
                                }
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Effective From (YYYY-MM)
                            </Label>
                            <Input
                                type="text"
                                placeholder="2026-01"
                                value={effectiveFrom}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={createBudget.isPending}
                                className="font-bold"
                            >
                                {createBudget.isPending ? "Saving..." : "Add Budget"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* B4: Batch Setup Dialog */}
            <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-wide">
                            Batch Budget Setup
                        </DialogTitle>
                        <DialogDescription>
                            Set budgets for multiple categories at once. Leave blank to skip.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {availableCategories.map((c) => {
                            const suggestion = suggestions.find((s) => s.category.id === c.id);
                            return (
                                <div key={c.id} className="flex items-center gap-3">
                                    <span className="text-sm font-bold w-28 truncate shrink-0">
                                        {c.name}
                                    </span>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={
                                            suggestion
                                                ? formatInputWithCommas(
                                                      String(suggestion.suggestedLimit),
                                                      currency
                                                  )
                                                : "0"
                                        }
                                        value={batchLimits[c.id] ?? ""}
                                        onChange={(e) =>
                                            setBatchLimits((prev) => ({
                                                ...prev,
                                                [c.id]: formatInputWithCommas(
                                                    e.target.value,
                                                    currency
                                                ),
                                            }))
                                        }
                                        className="font-mono flex-1"
                                    />
                                    {suggestion && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="xs"
                                            onClick={() =>
                                                setBatchLimits((prev) => ({
                                                    ...prev,
                                                    [c.id]: formatInputWithCommas(
                                                        String(suggestion.suggestedLimit),
                                                        currency
                                                    ),
                                                }))
                                            }
                                            className="text-xs text-primary shrink-0"
                                        >
                                            Use {formatAmount(suggestion.suggestedLimit)}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleBatchSetup}
                            disabled={createBudget.isPending}
                            className="font-bold"
                        >
                            {createBudget.isPending ? "Creating..." : "Create Budgets"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {confirmDialog}
        </motion.div>
    );
}
