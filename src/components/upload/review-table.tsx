"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
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
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Extracted Entries
                    </p>
                    <p className="text-lg font-bold font-mono">
                        {formatAmount(totalAmount)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({approvedEntries.length}/{entries.length} approved)
                        </span>
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={approveAll}
                    className="font-bold gap-1"
                >
                    <Check className="size-3.5" strokeWidth={2.5} />
                    Approve All
                </Button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border-2 border-border shadow-[3px_3px_0px_0px] shadow-border/50 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2">
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest">
                                Category
                            </TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest text-right">
                                Amount
                            </TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest w-24 text-center">
                                Confidence
                            </TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest w-[100px]">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.map((entry) => (
                            <TableRow
                                key={entry.id}
                                className={`hover:bg-muted/30 transition-colors ${!entry.approved ? "opacity-50" : ""}`}
                            >
                                <TableCell>
                                    <button
                                        onClick={() => toggleApproval(entry.id)}
                                        className={`flex size-5 items-center justify-center rounded border-2 transition-colors ${
                                            entry.approved
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border hover:border-primary"
                                        }`}
                                    >
                                        {entry.approved && <Check className="size-3" />}
                                    </button>
                                </TableCell>

                                <TableCell className="font-bold">
                                    {editingId === entry.id ? (
                                        <Input
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                            className="h-7 text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <span>{entry.category}</span>
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
                                    <div className="flex items-center gap-1">
                                        {editingId === entry.id ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={saveEdit}
                                                    aria-label="Save edit"
                                                    className="h-8 w-8 text-green-500 hover:text-green-600"
                                                >
                                                    <Check className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={cancelEdit}
                                                    aria-label="Cancel edit"
                                                    className="h-8 w-8"
                                                >
                                                    <X className="size-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => startEdit(entry)}
                                                    aria-label="Edit entry"
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => removeEntry(entry.id)}
                                                    aria-label="Remove entry"
                                                    className="h-8 w-8"
                                                >
                                                    <X className="size-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile — dense single-row list */}
            <div className="md:hidden rounded-lg border-2 border-border overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {entries.map((entry, idx) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`flex items-center gap-2 px-3 py-2 ${
                                idx > 0 ? "border-t border-border" : ""
                            } ${!entry.approved ? "opacity-40" : ""}`}
                        >
                            {editingId === entry.id ? (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Input
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                        className="h-7 text-xs flex-1 min-w-0"
                                        autoFocus
                                    />
                                    <Input
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="h-7 text-xs font-mono w-24"
                                        type="number"
                                        step="0.01"
                                    />
                                    <button onClick={saveEdit} className="p-1 text-green-500">
                                        <Check className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="p-1 text-muted-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => toggleApproval(entry.id)}
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                            entry.approved
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border hover:border-primary"
                                        }`}
                                    >
                                        {entry.approved && <Check className="size-3" />}
                                    </button>
                                    <span className="text-xs font-bold truncate flex-1 min-w-0">
                                        {entry.category}
                                    </span>
                                    <ConfidenceBadge confidence={entry.confidence} />
                                    <span className="text-xs font-mono font-bold shrink-0">
                                        {formatAmount(entry.amount)}
                                    </span>
                                    <button
                                        onClick={() => startEdit(entry)}
                                        className="p-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <Pencil className="size-3" />
                                    </button>
                                    <button
                                        onClick={() => removeEntry(entry.id)}
                                        className="p-1 text-destructive/60 hover:text-destructive"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <Button
                onClick={handleCommit}
                disabled={approvedEntries.length === 0 || loading}
                className="w-full font-bold gap-1.5 border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground hover:shadow-[3px_3px_0px_0px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
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
