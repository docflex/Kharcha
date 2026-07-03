"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
    Pencil,
    Trash2,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    MessageSquare,
    Check,
    Wallet,
} from "lucide-react";
import { getCategoryIcon } from "@/components/ui/icon-picker";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/contexts/currency-context";
import { monthNumberToName } from "@/lib/utils/dates";
import { usePageSize } from "@/hooks/use-page-size";

interface ExpenseRow {
    id: string;
    categoryId: string;
    categoryName: string;
    year: number;
    month: number;
    amount: number;
    source: "manual" | "ocr" | "import";
    confidence: number | null;
    notes: string | null;
}

export type SortColumn = "category" | "period" | "amount" | "source";
export type SortDirection = "asc" | "desc";

interface ExpenseTableProps {
    expenses: ExpenseRow[];
    categories?: { id: string; name: string; icon?: string | null; color?: string | null }[];
    onEdit: (expense: ExpenseRow) => void;
    onDelete: (id: string) => void;
    onInlineEdit?: (id: string, field: string, value: unknown) => void;
    loading?: boolean;
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    onSort: (column: SortColumn) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

const sourceVariant: Record<string, "default" | "secondary" | "outline"> = {
    manual: "outline",
    ocr: "default",
    import: "secondary",
};

function amountWeightClass(amount: number, maxAmount: number): string {
    if (maxAmount === 0) return "text-sm";
    const ratio = amount / maxAmount;
    if (ratio > 0.7) return "text-base font-black";
    if (ratio > 0.3) return "text-sm font-bold";
    return "text-sm font-medium text-muted-foreground";
}

function SortIcon({
    active,
    direction,
}: {
    column?: string;
    active: boolean;
    direction: SortDirection;
}) {
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return direction === "asc" ? (
        <ArrowUp className="h-3 w-3" />
    ) : (
        <ArrowDown className="h-3 w-3" />
    );
}

function InlineAmountEditor({
    value,
    onSave,
    onCancel,
}: {
    value: number;
    onSave: (v: number) => void;
    onCancel: () => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [val, setVal] = useState(String(value));

    useEffect(() => {
        ref.current?.focus();
        ref.current?.select();
    }, []);

    const saved = useRef(false);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0 && num !== value) {
                saved.current = true;
                onSave(num);
            } else {
                onCancel();
            }
        }
        if (e.key === "Escape") onCancel();
    }

    return (
        <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
                if (saved.current) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0 && num !== value) onSave(num);
                else onCancel();
            }}
            className="h-7 w-28 font-mono text-right text-sm"
        />
    );
}

function InlineCategoryEditor({
    value,
    categories,
    onSave,
    onCancel,
}: {
    value: string;
    categories: { id: string; name: string }[];
    onSave: (v: string) => void;
    onCancel: () => void;
}) {
    return (
        <Select
            defaultOpen
            value={value}
            onValueChange={(v) => {
                if (v && v !== value) onSave(v);
                else onCancel();
            }}
            items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
        >
            <SelectTrigger className="h-7 w-36 text-sm font-bold">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                        {c.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function ExpenseTable({
    expenses,
    categories = [],
    onEdit,
    onDelete,
    onInlineEdit,
    loading,
    sortColumn,
    sortDirection,
    onSort,
    selectedIds,
    onSelectionChange,
}: ExpenseTableProps) {
    const { format: formatAmount } = useCurrency();
    const pageSize = usePageSize(48, 400);
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(expenses.length / pageSize);
    const paginatedExpenses = expenses.slice((page - 1) * pageSize, page * pageSize);

    const selectable = !!onSelectionChange;
    const allOnPageSelected =
        selectable &&
        selectedIds &&
        paginatedExpenses.length > 0 &&
        paginatedExpenses.every((e) => selectedIds.has(e.id));

    function toggleSelect(id: string) {
        if (!selectedIds || !onSelectionChange) return;
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    }

    function toggleSelectAll() {
        if (!onSelectionChange || !selectedIds) return;
        if (allOnPageSelected) {
            const next = new Set(selectedIds);
            paginatedExpenses.forEach((e) => next.delete(e.id));
            onSelectionChange(next);
        } else {
            const next = new Set(selectedIds);
            paginatedExpenses.forEach((e) => next.add(e.id));
            onSelectionChange(next);
        }
    }

    const [inlineEdit, setInlineEdit] = useState<{
        id: string;
        field: "amount" | "category";
    } | null>(null);

    // Reset to page 1 when data changes
    const dataKey = expenses.length;
    const [prevDataKey, setPrevDataKey] = useState(dataKey);
    if (dataKey !== prevDataKey) {
        setPrevDataKey(dataKey);
        if (page > Math.ceil(dataKey / pageSize)) setPage(1);
    }

    const maxAmount = expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0;

    const handleInlineSave = useCallback(
        (id: string, field: string, value: unknown) => {
            onInlineEdit?.(id, field, value);
            setInlineEdit(null);
        },
        [onInlineEdit]
    );

    if (loading || expenses.length === 0) {
        return (
            <div className="rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50 space-y-3">
                {loading ? (
                    <p className="text-sm text-muted-foreground font-mono animate-pulse">
                        Loading expenses...
                    </p>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-border bg-muted/50">
                                <Wallet className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                        <p className="text-sm font-bold">No expenses found</p>
                        <p className="text-xs text-muted-foreground font-mono">
                            Try adjusting your filters or add a new expense
                        </p>
                    </>
                )}
            </div>
        );
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const sortableHeader = (label: string, col: SortColumn) => (
        <button
            onClick={() => onSort(col)}
            className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest hover:text-foreground transition-colors"
        >
            {label}
            <SortIcon column={col} active={sortColumn === col} direction={sortDirection} />
        </button>
    );

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border-2 border-border shadow-[3px_3px_0px_0px] shadow-border/50 overflow-x-auto">
                <Table className="min-w-[600px]">
                    <TableHeader>
                        <TableRow className="border-b-2">
                            {selectable && (
                                <TableHead className="w-[40px]">
                                    <button
                                        onClick={toggleSelectAll}
                                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                                            allOnPageSelected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border hover:border-primary"
                                        }`}
                                        aria-label="Select all"
                                    >
                                        {allOnPageSelected && <Check className="h-3 w-3" />}
                                    </button>
                                </TableHead>
                            )}
                            <TableHead>{sortableHeader("Category", "category")}</TableHead>
                            <TableHead>{sortableHeader("Period", "period")}</TableHead>
                            <TableHead className="text-right">
                                {sortableHeader("Amount", "amount")}
                            </TableHead>
                            <TableHead>{sortableHeader("Source", "source")}</TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest hidden lg:table-cell">
                                Notes
                            </TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest w-[100px]">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedExpenses.map((expense) => (
                            <TableRow
                                key={expense.id}
                                className={`hover:bg-muted/30 transition-colors ${
                                    selectable && selectedIds?.has(expense.id) ? "bg-primary/5" : ""
                                }`}
                            >
                                {selectable && (
                                    <TableCell>
                                        <button
                                            onClick={() => toggleSelect(expense.id)}
                                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                                                selectedIds?.has(expense.id)
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border hover:border-primary"
                                            }`}
                                            aria-label={`Select expense ${expense.categoryName}`}
                                        >
                                            {selectedIds?.has(expense.id) && (
                                                <Check className="h-3 w-3" />
                                            )}
                                        </button>
                                    </TableCell>
                                )}
                                <TableCell className="font-bold">
                                    {(() => {
                                        const cat = categories.find(
                                            (c) => c.id === expense.categoryId
                                        );
                                        const Icon = getCategoryIcon(cat?.icon);
                                        return (
                                            <span className="inline-flex items-center gap-1.5">
                                                {Icon ? (
                                                    <Icon
                                                        className="h-3.5 w-3.5 shrink-0"
                                                        style={
                                                            cat?.color
                                                                ? { color: cat.color }
                                                                : undefined
                                                        }
                                                    />
                                                ) : cat?.color ? (
                                                    <span
                                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: cat.color }}
                                                    />
                                                ) : null}
                                            </span>
                                        );
                                    })()}
                                    {inlineEdit?.id === expense.id &&
                                    inlineEdit.field === "category" ? (
                                        <InlineCategoryEditor
                                            value={expense.categoryId}
                                            categories={categories}
                                            onSave={(v) =>
                                                handleInlineSave(expense.id, "categoryId", v)
                                            }
                                            onCancel={() => setInlineEdit(null)}
                                        />
                                    ) : (
                                        <span
                                            onDoubleClick={() =>
                                                onInlineEdit &&
                                                setInlineEdit({
                                                    id: expense.id,
                                                    field: "category",
                                                })
                                            }
                                            className={onInlineEdit ? "cursor-pointer" : ""}
                                            title={onInlineEdit ? "Double-click to edit" : ""}
                                        >
                                            {expense.categoryName}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                    {monthNumberToName(expense.month, "short")} {expense.year}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {inlineEdit?.id === expense.id &&
                                    inlineEdit.field === "amount" ? (
                                        <InlineAmountEditor
                                            value={expense.amount}
                                            onSave={(v) =>
                                                handleInlineSave(expense.id, "amount", v)
                                            }
                                            onCancel={() => setInlineEdit(null)}
                                        />
                                    ) : (
                                        <span
                                            onDoubleClick={() =>
                                                onInlineEdit &&
                                                setInlineEdit({
                                                    id: expense.id,
                                                    field: "amount",
                                                })
                                            }
                                            className={`${amountWeightClass(expense.amount, maxAmount)} ${onInlineEdit ? "cursor-pointer" : ""}`}
                                            title={onInlineEdit ? "Double-click to edit" : ""}
                                        >
                                            {formatAmount(expense.amount)}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={sourceVariant[expense.source] || "outline"}>
                                        {expense.source}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-[150px] truncate hidden lg:table-cell">
                                    {expense.notes || "—"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(expense)}
                                            aria-label="Edit expense"
                                            className="h-8 w-8"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => onDelete(expense.id)}
                                            aria-label="Delete expense"
                                            className="h-8 w-8"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        {expense.notes && (
                                            <button
                                                className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                title={expense.notes}
                                                aria-label="View notes"
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="border-t-2 border-border">
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalItems={expenses.length}
                        pageSize={pageSize}
                    />
                </div>

                {/* Total footer */}
                <div className="flex items-center justify-between border-t-2 border-border bg-muted/50 px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Total ({expenses.length} entries)
                    </span>
                    <span className="text-lg font-black font-mono">{formatAmount(total)}</span>
                </div>
            </div>

            {/* Mobile Card Layout — compact rows, actions in thumb zone */}
            <div className="md:hidden space-y-2">
                <AnimatePresence mode="popLayout">
                    {paginatedExpenses.map((expense) => (
                        <motion.div
                            key={expense.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="rounded-lg border-2 border-border bg-card px-3 py-2.5 shadow-[2px_2px_0px_0px] shadow-border/50"
                        >
                            {/* Row 1: checkbox + category name + amount */}
                            <div className="flex items-center gap-2">
                                {selectable && (
                                    <button
                                        onClick={() => toggleSelect(expense.id)}
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                            selectedIds?.has(expense.id)
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border hover:border-primary"
                                        }`}
                                        aria-label={`Select expense ${expense.categoryName}`}
                                    >
                                        {selectedIds?.has(expense.id) && (
                                            <Check className="h-3 w-3" />
                                        )}
                                    </button>
                                )}
                                <span className="font-bold text-sm truncate flex-1 min-w-0">
                                    {expense.categoryName}
                                </span>
                                <span
                                    className={`font-mono shrink-0 text-sm ${amountWeightClass(expense.amount, maxAmount)}`}
                                >
                                    {formatAmount(expense.amount)}
                                </span>
                            </div>
                            {/* Row 2: date + source + actions (all inline, thumb-reachable) */}
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    {monthNumberToName(expense.month, "short")} {expense.year}
                                </span>
                                <Badge
                                    variant={sourceVariant[expense.source] || "outline"}
                                    className="text-[10px] px-1.5 py-0"
                                >
                                    {expense.source}
                                </Badge>
                                <div className="flex-1" />
                                <button
                                    onClick={() => onEdit(expense)}
                                    aria-label="Edit expense"
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => onDelete(expense.id)}
                                    aria-label="Delete expense"
                                    className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Mobile Pagination */}
                <div className="rounded-lg border-2 border-border">
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalItems={expenses.length}
                        pageSize={pageSize}
                    />
                </div>

                {/* Mobile Total — extra right padding to clear the FAB */}
                <div className="flex items-center justify-between rounded-lg border-2 border-border bg-muted/50 px-4 pr-16 py-3 shadow-[3px_3px_0px_0px] shadow-border/50">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Total ({expenses.length})
                    </span>
                    <span className="text-lg font-black font-mono">{formatAmount(total)}</span>
                </div>
            </div>
        </>
    );
}
