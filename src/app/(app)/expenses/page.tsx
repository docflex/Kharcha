"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
    Plus,
    AlertCircle,
    Download,
    FileSpreadsheet,
    Trash2,
    Tag,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { monthNumberToName } from "@/lib/utils/dates";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { ExpenseForm } from "@/components/expenses/expense-form";
import type { SortColumn, SortDirection } from "@/components/expenses/expense-table";
import {
    useExpenses,
    useCreateExpense,
    useUpdateExpense,
    useDeleteExpense,
    useBulkDeleteExpenses,
    useBulkUpdateExpenses,
} from "@/hooks/use-expenses";
import type { ExpenseRow } from "@/hooks/use-expenses";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCategories } from "@/hooks/use-categories";
import { usePageTour } from "@/hooks/use-page-tour";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ExpensesPage() {
    const searchParams = useSearchParams();
    const globalStore = useAppStore();
    const [year, setYear] = useState(() => {
        const p = searchParams.get("year");
        return p ? Number(p) : globalStore.year;
    });
    const [month, setMonth] = useState<number | null>(() => {
        const p = searchParams.get("month");
        return p ? Number(p) : globalStore.month;
    });
    const [direction, setDirection] = useState(0);
    const [source, setSource] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortColumn, setSortColumn] = useState<SortColumn>("amount");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const { data: categories = [] } = useCategories();
    const {
        data: expenses = [],
        isLoading: queryLoading,
        error: expensesError,
    } = useExpenses(year, month, categoryFilter);
    const error = expensesError ? "Failed to fetch expenses" : null;

    // Prevent hydration mismatch from persisted React Query cache
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    const loading = !mounted || queryLoading;

    usePageTour("expenses", !loading);

    const [formOpen, setFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense();
    const deleteExpense = useDeleteExpense();
    const bulkDelete = useBulkDeleteExpenses();
    const bulkUpdate = useBulkUpdateExpenses();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-open add form when navigated with ?add=true
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (searchParams.get("add") === "true") {
            setEditingExpense(null);
            setFormOpen(true);
        }
    }, [searchParams]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Available years for filter
    const currentYear = new Date().getFullYear();
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Build table rows with category names
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    let rows: ExpenseRow[] = expenses.map((e) => ({
        ...e,
        categoryName: categoryMap.get(e.categoryId) || "Unknown",
    }));

    // Client-side source filter (API doesn't support it yet)
    if (source) {
        rows = rows.filter((r) => r.source === source);
    }

    // Client-side search filter
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        rows = rows.filter(
            (r) =>
                r.categoryName.toLowerCase().includes(q) ||
                (r.notes && r.notes.toLowerCase().includes(q))
        );
    }

    // Sorting
    rows.sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;
        switch (sortColumn) {
            case "category":
                return dir * a.categoryName.localeCompare(b.categoryName);
            case "period":
                return dir * (a.year * 100 + a.month - (b.year * 100 + b.month));
            case "amount":
                return dir * (a.amount - b.amount);
            case "source":
                return dir * a.source.localeCompare(b.source);
            default:
                return dir * (b.amount - a.amount);
        }
    });

    function handleSort(column: SortColumn) {
        if (sortColumn === column) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection(column === "amount" ? "desc" : "asc");
        }
    }

    async function handleAddExpense(data: {
        categoryId: string;
        year: number;
        month: number;
        amount: number;
        source: "manual" | "ocr" | "import";
        notes?: string;
    }) {
        await createExpense.mutateAsync(data);
        toast.success("Expense added");
    }

    const { confirm, dialog: confirmDialog } = useConfirmDialog();

    async function handleEditExpense(data: {
        categoryId: string;
        year: number;
        month: number;
        amount: number;
        source: "manual" | "ocr" | "import";
        notes?: string;
    }) {
        if (!editingExpense) return;
        confirm({
            title: "Update Expense",
            description: "Save changes to this expense?",
            confirmLabel: "Save",
            variant: "default",
            onConfirm: async () => {
                await updateExpense.mutateAsync({ id: editingExpense.id, ...data });
                setEditingExpense(null);
                toast.success("Expense updated");
            },
        });
    }

    function handleDelete(id: string) {
        confirm({
            title: "Delete Expense",
            description: "This expense will be permanently removed.",
            confirmLabel: "Delete",
            variant: "destructive",
            onConfirm: async () => {
                await deleteExpense.mutateAsync(id);
                toast.success("Expense deleted");
            },
        });
    }

    function handleEdit(expense: ExpenseRow) {
        setEditingExpense(expense);
        setFormOpen(true);
    }

    function handleOpenAdd() {
        setEditingExpense(null);
        setFormOpen(true);
    }

    const handleInlineEdit = useCallback(
        (id: string, field: string, value: unknown) => {
            confirm({
                title: "Update Expense",
                description: `Update ${field} for this expense?`,
                confirmLabel: "Save",
                variant: "default",
                onConfirm: async () => {
                    try {
                        await updateExpense.mutateAsync({ id, [field]: value });
                        toast.success("Expense updated");
                    } catch {
                        toast.error("Failed to update expense");
                    }
                },
            });
        },
        [updateExpense, confirm]
    );

    function handleExport(format: "xlsx" | "csv") {
        const params = new URLSearchParams({ format });
        if (year) params.set("year", String(year));
        if (month) params.set("month", String(month));
        window.open(`/api/export?${params.toString()}`, "_blank");
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3 md:space-y-6"
        >
            {/* Header — hidden on mobile (bottom nav + FAB cover it) */}
            <motion.div
                variants={item}
                className="hidden sm:flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h1 className="text-2xl font-black tracking-tight uppercase md:text-4xl">
                        Expenses
                    </h1>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                        View, add, edit, and delete expense entries
                    </p>
                </div>
                <div data-tour="expense-actions" className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleExport("xlsx")}
                        className="font-bold gap-1.5"
                    >
                        <FileSpreadsheet className="h-4 w-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleExport("csv")}
                        className="font-bold gap-1.5"
                    >
                        <Download className="h-4 w-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">CSV</span>
                    </Button>
                    <Button onClick={handleOpenAdd} className="font-bold gap-1.5">
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        Add Expense
                    </Button>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div variants={item} data-tour="expense-filters">
                <ExpenseFilters
                    year={year}
                    month={month}
                    source={source}
                    categoryId={categoryFilter}
                    searchQuery={searchQuery}
                    categories={categories}
                    availableYears={availableYears}
                    onYearChange={setYear}
                    onMonthChange={setMonth}
                    onNavigate={(dir) => {
                        setDirection(dir);
                    }}
                    onSourceChange={setSource}
                    onCategoryChange={setCategoryFilter}
                    onSearchChange={setSearchQuery}
                />
            </motion.div>

            {/* Error */}
            {error && (
                <motion.div
                    variants={item}
                    className="flex items-center gap-2 rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3"
                >
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive font-medium">{error}</span>
                </motion.div>
            )}

            {/* Table */}
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={`${year}-${month}`}
                    data-tour="expense-table"
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    <ExpenseTable
                        expenses={rows}
                        categories={categories}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onInlineEdit={handleInlineEdit}
                        loading={loading}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-[7.5rem] md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border-2 border-border bg-card px-4 py-3 shadow-[4px_4px_0px_0px] shadow-border/50"
                    >
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            {selectedIds.size} selected
                        </span>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={bulkDelete.isPending}
                            onClick={() => {
                                confirm({
                                    title: `Delete ${selectedIds.size} Expenses`,
                                    description: `Permanently delete ${selectedIds.size} selected expense(s)?`,
                                    confirmLabel: "Delete",
                                    variant: "destructive",
                                    onConfirm: async () => {
                                        await bulkDelete.mutateAsync(Array.from(selectedIds));
                                        toast.success(`Deleted ${selectedIds.size} expenses`);
                                        setSelectedIds(new Set());
                                    },
                                });
                            }}
                            className="font-bold text-xs uppercase tracking-wider gap-1"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete ({selectedIds.size})
                        </Button>
                        <BulkRecategorize
                            categories={categories}
                            disabled={bulkUpdate.isPending}
                            onRecategorize={async (categoryId) => {
                                await bulkUpdate.mutateAsync({
                                    ids: Array.from(selectedIds),
                                    categoryId,
                                });
                                toast.success(`Re-categorized ${selectedIds.size} expenses`);
                                setSelectedIds(new Set());
                            }}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedIds(new Set())}
                            aria-label="Clear selection"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add/Edit Form Dialog */}
            <ExpenseForm
                open={formOpen}
                onOpenChange={setFormOpen}
                categories={categories}
                mode={editingExpense ? "edit" : "add"}
                initialData={
                    editingExpense
                        ? {
                              id: editingExpense.id,
                              categoryId: editingExpense.categoryId,
                              year: editingExpense.year,
                              month: editingExpense.month,
                              amount: editingExpense.amount,
                              source: editingExpense.source,
                              notes: editingExpense.notes || undefined,
                          }
                        : undefined
                }
                onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
            />
            {confirmDialog}

            {/* Mobile fixed bottom month nav — thumb zone (hidden when bulk selecting) */}
            {selectedIds.size === 0 && (
                <div className="md:hidden fixed bottom-[3.5rem] left-0 right-0 z-40 flex items-center justify-center gap-3 border-t-2 border-border bg-background px-4 py-2 shadow-[0_-2px_8px_0px] shadow-black/20">
                    <button
                        onClick={() => {
                            if (month === null) return;
                            setDirection(-1);
                            if (month === 1) {
                                setMonth(12);
                                setYear(year - 1);
                            } else {
                                setMonth(month - 1);
                            }
                        }}
                        disabled={month === null}
                        className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span className="font-mono font-bold text-sm min-w-[100px] text-center">
                        {month ? monthNumberToName(month, "short") : "All"} {year}
                    </span>
                    <button
                        onClick={() => {
                            if (month === null) return;
                            setDirection(1);
                            if (month === 12) {
                                setMonth(1);
                                setYear(year + 1);
                            } else {
                                setMonth(month + 1);
                            }
                        }}
                        disabled={month === null}
                        className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-30"
                    >
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

function BulkRecategorize({
    categories,
    disabled,
    onRecategorize,
}: {
    categories: { id: string; name: string }[];
    disabled: boolean;
    onRecategorize: (categoryId: string) => void;
}) {
    return (
        <Select onValueChange={(v: string | null) => v && onRecategorize(v)} disabled={disabled}>
            <SelectTrigger className="h-8 w-auto gap-1 border-2 border-border bg-card text-xs font-bold uppercase tracking-wider">
                <Tag className="h-3.5 w-3.5" />
                <SelectValue placeholder="Re-categorize" />
            </SelectTrigger>
            <SelectContent className="border-2 border-border">
                {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-mono">
                        {c.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
