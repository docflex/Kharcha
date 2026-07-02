"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { monthNumberToName, MONTH_SELECT_ITEMS } from "@/lib/utils/dates";
import { useCurrency } from "@/contexts/currency-context";
import { formatInputWithCommas, stripCommas } from "@/lib/utils/currency";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

interface ExpenseFormData {
    categoryId: string;
    year: number;
    month: number;
    amount: number;
    source: "manual" | "ocr" | "import";
    notes?: string;
}

interface ExpenseFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: { id: string; name: string }[];
    initialData?: ExpenseFormData & { id: string };
    onSubmit: (data: ExpenseFormData) => Promise<void>;
    mode: "add" | "edit";
}

export function ExpenseForm({
    open,
    onOpenChange,
    categories,
    initialData,
    onSubmit,
    mode,
}: ExpenseFormProps) {
    const now = new Date();
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
    const [year, setYear] = useState(initialData?.year || now.getFullYear());
    const [month, setMonth] = useState(initialData?.month || now.getMonth() + 1);
    const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
    const [source, setSource] = useState<"manual" | "ocr" | "import">(
        initialData?.source || "manual"
    );
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currency } = useCurrency();
    const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (initialData) {
            setCategoryId(initialData.categoryId);
            setYear(initialData.year);
            setMonth(initialData.month);
            setAmount(formatInputWithCommas(initialData.amount.toString(), currency));
            setSource(initialData.source);
            setNotes(initialData.notes || "");
        } else {
            setCategoryId("");
            setYear(now.getFullYear());
            setMonth(now.getMonth() + 1);
            setAmount("");
            setSource("manual");
            setNotes("");
        }
        setError(null);
    }, [initialData, open]);
    /* eslint-enable react-hooks/set-state-in-effect */

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!categoryId) {
            setError("Please select a category");
            return;
        }

        const parsedAmount = parseFloat(stripCommas(amount));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                categoryId,
                year,
                month,
                amount: parsedAmount,
                source,
                notes: notes.trim() || undefined,
            });
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save expense");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-wide">
                        {mode === "add" ? "Add Expense" : "Edit Expense"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "add"
                            ? "Add a new monthly expense entry"
                            : "Update this expense entry"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest">
                            Category
                        </Label>
                        <Select
                            value={categoryId}
                            onValueChange={(v) => v && setCategoryId(v)}
                            items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest">
                            Amount ({currencySymbol})
                        </Label>
                        <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) =>
                                setAmount(formatInputWithCommas(e.target.value, currency))
                            }
                            className="font-mono"
                        />
                    </div>

                    {/* Month & Year */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Month
                            </Label>
                            <Select
                                value={String(month)}
                                onValueChange={(v) => v && setMonth(Number(v))}
                                items={MONTH_SELECT_ITEMS}
                            >
                                <SelectTrigger className="w-full">
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
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Year
                            </Label>
                            <Input
                                type="number"
                                min="2000"
                                max="2100"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="font-mono"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest">Notes</Label>
                        <Input
                            placeholder="Optional note..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive font-medium">{error}</p>}

                    <DialogFooter>
                        <Button type="submit" disabled={submitting} className="font-bold">
                            {submitting
                                ? "Saving..."
                                : mode === "add"
                                  ? "Add Expense"
                                  : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
