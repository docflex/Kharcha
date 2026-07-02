"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
    Plus,
    Trash2,
    Pencil,
    Target,
    ListTree,
    ArrowRight,
    Compass,
    BarChart3,
    TrendingUp,
    UserCircle,
    Mail,
} from "lucide-react";
import { toast } from "sonner";
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
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
    useCategoryStats,
} from "@/hooks/use-categories";
import { useCurrency } from "@/contexts/currency-context";
import { CardSkeleton } from "@/components/layout/loading-skeleton";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { resetAllTours, startPageTour } from "@/lib/tour";
import { IconPicker, getCategoryIcon } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function SettingsPage() {
    const { data: categories = [], isLoading: queryLoading } = useCategories();

    // Prevent hydration mismatch from persisted React Query cache
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    const loading = !mounted || queryLoading;
    const { data: stats = [] } = useCategoryStats();
    const { format: formatAmount } = useCurrency();
    const [formOpen, setFormOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Form state
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<"expense" | "investment">("expense");
    const [newIcon, setNewIcon] = useState<string | null>(null);
    const [newColor, setNewColor] = useState<string | null>(null);

    const createCategory = useCreateCategory();
    const updateCategory = useUpdateCategory();
    const deleteCategory = useDeleteCategory();

    // Build stats map
    const statsMap = new Map(stats.map((s) => [s.categoryId, s]));

    function openAddForm() {
        setEditMode(false);
        setEditId(null);
        setNewName("");
        setNewType("expense");
        setNewIcon(null);
        setNewColor(null);
        setFormOpen(true);
    }

    function openEditForm(cat: {
        id: string;
        name: string;
        type: "expense" | "investment";
        icon: string | null;
        color: string | null;
    }) {
        setEditMode(true);
        setEditId(cat.id);
        setNewName(cat.name);
        setNewType(cat.type);
        setNewIcon(cat.icon);
        setNewColor(cat.color);
        setFormOpen(true);
    }

    const { confirm, dialog: confirmDialog } = useConfirmDialog();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) {
            toast.error("Category name is required");
            return;
        }

        if (editMode && editId) {
            confirm({
                title: "Update Category",
                description: `Save changes to "${newName.trim()}"?`,
                confirmLabel: "Save",
                variant: "default",
                onConfirm: async () => {
                    try {
                        await updateCategory.mutateAsync({
                            id: editId,
                            name: newName.trim(),
                            type: newType,
                            icon: newIcon,
                            color: newColor,
                        });
                        toast.success(`Category "${newName.trim()}" updated`);
                        setFormOpen(false);
                        setNewName("");
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Failed to save category";
                        if (msg.includes("409")) {
                            toast.error("Category already exists");
                        }
                    }
                },
            });
        } else {
            try {
                await createCategory.mutateAsync({
                    name: newName.trim(),
                    type: newType,
                    icon: newIcon,
                    color: newColor,
                });
                toast.success(`Category "${newName.trim()}" created`);
                setFormOpen(false);
                setNewName("");
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to save category";
                if (msg.includes("409")) {
                    toast.error("Category already exists");
                }
            }
        }
    }

    function handleDeleteCategory(id: string, name: string) {
        confirm({
            title: "Delete Category",
            description: `Delete "${name}"? Expenses using it will be affected.`,
            confirmLabel: "Delete",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    await deleteCategory.mutateAsync(id);
                    toast.success(`Category "${name}" deleted`);
                } catch (_e) {
                    // Global onError handler shows toast
                }
            },
        });
    }

    const expenseCategories = categories.filter((c) => c.type === "expense");
    const investmentCategories = categories.filter((c) => c.type === "investment");

    // S6: Usage summary
    const mostUsed = stats.length > 0 ? [...stats].sort((a, b) => b.count - a.count)[0] : null;
    const leastUsed =
        stats.length > 1
            ? [...stats].filter((s) => s.count > 0).sort((a, b) => a.count - b.count)[0]
            : null;
    const mostUsedName = mostUsed
        ? categories.find((c) => c.id === mostUsed.categoryId)?.name
        : null;
    const leastUsedName = leastUsed
        ? categories.find((c) => c.id === leastUsed.categoryId)?.name
        : null;

    function renderCategoryCard(cat: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
        type: "expense" | "investment";
    }) {
        const stat = statsMap.get(cat.id);
        return (
            <div
                key={cat.id}
                className="flex items-center justify-between rounded-md border-2 border-border bg-card px-3 py-2.5 group hover:border-primary/50 transition-colors overflow-hidden relative"
                style={
                    cat.color ? { borderLeftColor: cat.color, borderLeftWidth: "4px" } : undefined
                }
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {(() => {
                        const Icon = getCategoryIcon(cat.icon);
                        return Icon ? (
                            <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                                style={
                                    cat.color
                                        ? { borderColor: cat.color, color: cat.color }
                                        : undefined
                                }
                            >
                                <Icon className="h-3.5 w-3.5" />
                            </div>
                        ) : cat.color ? (
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: cat.color }}
                            />
                        ) : null;
                    })()}
                    <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{cat.name}</span>
                        {stat && stat.count > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {stat.count} {stat.count === 1 ? "entry" : "entries"}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditForm(cat)}
                        aria-label={`Edit ${cat.name}`}
                    >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        aria-label={`Delete ${cat.name}`}
                    >
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <h1 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
                    Settings
                </h1>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                    Manage categories, budgets, and account preferences
                </p>
            </motion.div>

            {/* Quick Links */}
            <motion.div variants={item} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                    href="/settings/profile"
                    className="flex items-center justify-between rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50 hover:border-primary transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-500/10 border border-green-500/20">
                            <UserCircle className="h-4 w-4 text-green-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                Profile
                            </p>
                            <p className="text-xs text-muted-foreground">Account & preferences</p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    href="/settings/budgets"
                    className="flex items-center justify-between rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50 hover:border-primary transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20">
                            <Target className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                Budget Targets
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Set monthly spending limits
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    href="/settings/email"
                    className="flex items-center justify-between rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50 hover:border-primary transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20">
                            <Mail className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                Email Reminders
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Weekly & monthly reports
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                <button
                    onClick={() => {
                        resetAllTours();
                        startPageTour("dashboard");
                    }}
                    className="flex items-center justify-between rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50 hover:border-primary transition-colors group text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                            <Compass className="h-4 w-4 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                Take a Tour
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Reset & replay guided tips on every page
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
            </motion.div>

            {/* Cross-page links */}
            <motion.div variants={item} className="flex flex-wrap gap-3 text-xs">
                <Link
                    href="/analytics"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                    <BarChart3 className="h-3 w-3" /> See Analytics →
                </Link>
                <Link
                    href="/persona"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                    <TrendingUp className="h-3 w-3" /> See Persona Insights →
                </Link>
            </motion.div>

            {/* Categories Section */}
            <motion.div variants={item}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <ListTree className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                        <h2 className="text-sm font-black uppercase tracking-widest">
                            Categories ({categories.length})
                        </h2>
                    </div>
                    <Button
                        onClick={openAddForm}
                        variant="outline"
                        size="sm"
                        className="font-bold gap-1"
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add
                    </Button>
                </div>

                {loading && (
                    <CardSkeleton
                        count={8}
                        className="!grid-cols-2 sm:!grid-cols-3 md:!grid-cols-4"
                    />
                )}

                {!loading && (
                    <div className="space-y-4">
                        {/* Expense categories */}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                Expense ({expenseCategories.length})
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {expenseCategories.map(renderCategoryCard)}
                            </div>
                        </div>

                        {/* Investment categories */}
                        {investmentCategories.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                    Investment ({investmentCategories.length})
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                    {investmentCategories.map(renderCategoryCard)}
                                </div>
                            </div>
                        )}

                        {/* S6: Usage Summary */}
                        {stats.length > 0 && (
                            <div className="rounded-lg border-2 border-border bg-muted/30 p-4 mt-2">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                    Usage Summary
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    {mostUsedName && (
                                        <span className="font-mono">
                                            <span className="text-muted-foreground">
                                                Most used:
                                            </span>{" "}
                                            <span className="font-bold">{mostUsedName}</span>
                                            <span className="text-muted-foreground text-xs ml-1">
                                                ({mostUsed!.count} entries,{" "}
                                                {formatAmount(mostUsed!.totalAmount)})
                                            </span>
                                        </span>
                                    )}
                                    {leastUsedName && leastUsedName !== mostUsedName && (
                                        <span className="font-mono">
                                            <span className="text-muted-foreground">
                                                Least used:
                                            </span>{" "}
                                            <span className="font-bold">{leastUsedName}</span>
                                            <span className="text-muted-foreground text-xs ml-1">
                                                ({leastUsed!.count} entries)
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Add/Edit Category Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-wide">
                            {editMode ? "Edit Category" : "Add Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editMode
                                ? "Update category details"
                                : "Create a new spending category"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Name
                            </Label>
                            <Input
                                placeholder="e.g. Subscriptions"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-widest">
                                    Icon
                                </Label>
                                <IconPicker value={newIcon} onChange={setNewIcon} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-widest">
                                    Color
                                </Label>
                                <ColorPicker value={newColor} onChange={setNewColor} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-widest">
                                Type
                            </Label>
                            <Select
                                value={newType}
                                onValueChange={(v) =>
                                    v && setNewType(v as "expense" | "investment")
                                }
                                items={{ expense: "Expense", investment: "Investment" }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="investment">Investment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={createCategory.isPending || updateCategory.isPending}
                                className="font-bold"
                            >
                                {createCategory.isPending || updateCategory.isPending
                                    ? "Saving..."
                                    : editMode
                                      ? "Update Category"
                                      : "Add Category"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {confirmDialog}
        </motion.div>
    );
}
