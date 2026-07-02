"use client";

import { useState, useCallback } from "react";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Pencil, Loader2 } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { OCR_CONFIDENCE_THRESHOLD } from "@/lib/constants";

export interface ReviewEntry {
    id: string;
    category: string;
    amount: number;
    confidence: number;
    conflict?: boolean;
    sourceImage?: string;
    approved: boolean;
}

interface ReviewTableProps {
    entries: ReviewEntry[];
    onApprove: (entries: ReviewEntry[]) => void;
    loading?: boolean;
}

export function ReviewTable({ entries: initial, onApprove, loading }: ReviewTableProps) {
    const { format: formatAmount } = useCurrency();
    const [entries, setEntries] = useState<ReviewEntry[]>(initial);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCategory, setEditCategory] = useState("");
    const [editAmount, setEditAmount] = useState("");

    const toggleApproval = useCallback((id: string) => {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, approved: !e.approved } : e)));
    }, []);

    const startEdit = useCallback((entry: ReviewEntry) => {
        setEditingId(entry.id);
        setEditCategory(entry.category);
        setEditAmount(String(entry.amount));
    }, []);

    const saveEdit = useCallback(() => {
        if (!editingId) return;
        setEntries((prev) =>
            prev.map((e) =>
                e.id === editingId
                    ? {
                          ...e,
                          category: editCategory.trim() || e.category,
                          amount: parseFloat(editAmount) || e.amount,
                          confidence: 1.0, // user-edited = full confidence
                      }
                    : e
            )
        );
        setEditingId(null);
    }, [editingId, editCategory, editAmount]);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
    }, []);

    const removeEntry = useCallback((id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const approvedEntries = entries.filter((e) => e.approved);
    const totalAmount = approvedEntries.reduce((sum, e) => sum + e.amount, 0);

    const handleCommit = () => {
        const toCommit = entries.filter((e) => e.approved);
        onApprove(toCommit);
    };

    const approveAll = useCallback(() => {
        setEntries((prev) => prev.map((e) => ({ ...e, approved: true })));
    }, []);

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-medium">No entries extracted</p>
                <p className="text-xs text-muted-foreground">Try uploading clearer screenshots</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Extracted Entries
                    </p>
                    <p className="text-lg font-bold font-mono">
                        {formatAmount(totalAmount)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({approvedEntries.length}/{entries.length} approved)
                        </span>
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={approveAll}>
                    <Check className="size-3.5" />
                    Approve All
                </Button>
            </div>

            <div className="rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-24 text-center">Confidence</TableHead>
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.map((entry) => (
                            <TableRow
                                key={entry.id}
                                className={!entry.approved ? "opacity-50" : undefined}
                            >
                                <TableCell>
                                    <button
                                        onClick={() => toggleApproval(entry.id)}
                                        className={`flex size-5 items-center justify-center rounded border transition-colors ${
                                            entry.approved
                                                ? "border-amber-500 bg-amber-500 text-white"
                                                : "border-muted-foreground/30 hover:border-muted-foreground"
                                        }`}
                                    >
                                        {entry.approved && <Check className="size-3" />}
                                    </button>
                                </TableCell>

                                <TableCell>
                                    {editingId === entry.id ? (
                                        <Input
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                            className="h-7 text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-medium">{entry.category}</span>
                                    )}
                                    {entry.conflict && (
                                        <Badge
                                            variant="outline"
                                            className="ml-2 border-amber-500/50 text-amber-500"
                                        >
                                            <AlertTriangle className="mr-1 size-3" />
                                            Conflict
                                        </Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-right font-mono">
                                    {editingId === entry.id ? (
                                        <Input
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="h-7 text-right text-sm font-mono"
                                            type="number"
                                            step="0.01"
                                        />
                                    ) : (
                                        formatAmount(entry.amount)
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    <ConfidenceBadge confidence={entry.confidence} />
                                </TableCell>

                                <TableCell>
                                    <div className="flex gap-1">
                                        {editingId === entry.id ? (
                                            <>
                                                <button
                                                    onClick={saveEdit}
                                                    className="rounded p-1 text-green-500 hover:bg-green-500/10"
                                                >
                                                    <Check className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEdit(entry)}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => removeEntry(entry.id)}
                                                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Button
                onClick={handleCommit}
                disabled={approvedEntries.length === 0 || loading}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Check className="size-4" />
                        Commit {approvedEntries.length} Entr
                        {approvedEntries.length !== 1 ? "ies" : "y"} to Expenses
                    </>
                )}
            </Button>
        </div>
    );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
    const pct = Math.round(confidence * 100);
    const isLow = confidence < OCR_CONFIDENCE_THRESHOLD;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono ${
                isLow
                    ? "bg-red-500/10 text-red-500"
                    : confidence > 0.8
                      ? "bg-green-500/10 text-green-500"
                      : "bg-amber-500/10 text-amber-500"
            }`}
        >
            {pct}%
        </span>
    );
}
