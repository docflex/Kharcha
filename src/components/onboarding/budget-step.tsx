"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Target, Loader2, SkipForward } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/use-categories";
import { useCreateBudget } from "@/hooks/use-budgets";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCurrency } from "@/contexts/currency-context";
import { formatInputWithCommas, stripCommas } from "@/lib/utils/currency";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";

interface BudgetStepProps {
    onComplete: () => void;
    onSkip: () => void;
}

export function BudgetStep({ onComplete, onSkip }: BudgetStepProps) {
    const { data: categories = [] } = useCategories();
    const now = new Date();
    const { data: analytics } = useAnalytics(now.getFullYear(), now.getMonth() + 1);
    const createBudget = useCreateBudget();
    const [saving, setSaving] = useState(false);
    const { currency } = useCurrency();
    const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";

    // Build budget suggestions from analytics top categories
    const topCats = analytics?.topCategories ?? [];
    const suggestions = topCats.slice(0, 5).map((cat) => {
        // Round up to nearest 500 for a clean budget target
        const suggested = Math.ceil((cat.amount * 1.1) / 500) * 500;
        return {
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            avgSpend: cat.amount,
            suggested: Math.max(suggested, 500),
        };
    });

    const [budgetValues, setBudgetValues] = useState<Record<string, string>>({});

    function getBudgetValue(categoryId: string, suggested: number): string {
        return budgetValues[categoryId] ?? formatInputWithCommas(String(suggested), currency);
    }

    function setBudgetValue(categoryId: string, value: string) {
        setBudgetValues((prev) => ({
            ...prev,
            [categoryId]: formatInputWithCommas(value, currency),
        }));
    }

    async function handleSaveBudgets() {
        setSaving(true);
        const effectiveFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        let saved = 0;

        for (const s of suggestions) {
            const raw = getBudgetValue(s.categoryId, s.suggested);
            const limit = parseFloat(stripCommas(raw));
            if (isNaN(limit) || limit <= 0) continue;

            try {
                await createBudget.mutateAsync({
                    categoryId: s.categoryId,
                    monthlyLimit: limit,
                    effectiveFrom,
                });
                saved++;
            } catch (_err) {
                // Silently skip failures (e.g. duplicate budget)
            }
        }

        if (saved > 0) {
            toast.success(`${saved} budget${saved !== 1 ? "s" : ""} created!`);
        }
        setSaving(false);
        onComplete();
    }

    const expenseCategories = categories.filter((c) => c.type === "expense");

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center space-y-6 py-8"
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                <Target className="h-8 w-8 text-blue-500" strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight uppercase md:text-3xl">
                    Set Budgets
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                    {suggestions.length > 0
                        ? "Based on your spending, here are suggested budgets. Adjust as needed."
                        : `You have ${expenseCategories.length} categories. Set budgets later in Settings → Budgets.`}
                </p>
            </div>

            {suggestions.length > 0 ? (
                <div className="w-full max-w-md space-y-3">
                    {suggestions.map((s) => (
                        <div
                            key={s.categoryId}
                            className="flex items-center gap-3 rounded-lg border-2 border-border bg-card p-3"
                        >
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-bold truncate">{s.categoryName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                    avg ₹{s.avgSpend.toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                    {currencySymbol}
                                </span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={getBudgetValue(s.categoryId, s.suggested)}
                                    onChange={(e) => setBudgetValue(s.categoryId, e.target.value)}
                                    className="pl-7 text-sm font-mono font-bold h-9 border-2"
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleSaveBudgets}
                        disabled={saving}
                        className="w-full rounded-md border-2 border-foreground bg-primary text-primary-foreground px-4 py-2.5 text-sm font-black uppercase tracking-wider shadow-[3px_3px_0px_0px] shadow-foreground hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            `Set ${suggestions.length} Budget${suggestions.length !== 1 ? "s" : ""}`
                        )}
                    </button>
                </div>
            ) : (
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground max-w-md">
                    No spending data yet to suggest budgets. You can set budgets anytime from the
                    Settings page.
                </div>
            )}

            <button
                onClick={onSkip}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
                <SkipForward className="h-4 w-4" strokeWidth={2.5} />
                Skip — I&apos;ll set budgets later
            </button>
        </motion.div>
    );
}
