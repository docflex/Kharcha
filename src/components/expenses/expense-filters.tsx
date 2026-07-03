"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { monthNumberToName, MONTH_SELECT_ITEMS } from "@/lib/utils/dates";

interface ExpenseFiltersProps {
    year: number;
    month: number | null;
    source: string | null;
    categoryId: string | null;
    searchQuery: string;
    categories: { id: string; name: string }[];
    availableYears: number[];
    onYearChange: (year: number) => void;
    onMonthChange: (month: number | null) => void;
    onSourceChange: (source: string | null) => void;
    onCategoryChange: (categoryId: string | null) => void;
    onSearchChange: (query: string) => void;
    onNavigate?: (direction: -1 | 1) => void;
}

export function ExpenseFilters({
    year,
    month,
    source,
    categoryId,
    searchQuery,
    categories,
    availableYears,
    onYearChange,
    onMonthChange,
    onSourceChange,
    onCategoryChange,
    onSearchChange,
    onNavigate,
}: ExpenseFiltersProps) {
    function navigateMonth(dir: -1 | 1) {
        if (month === null) return;
        onNavigate?.(dir);
        let newMonth = month + dir;
        let newYear = year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        onMonthChange(newMonth);
        onYearChange(newYear);
    }

    const monthNav = (
        <div className="flex items-center gap-2">
            <button
                onClick={() => navigateMonth(-1)}
                disabled={month === null}
                className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-30 disabled:pointer-events-none"
            >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <Select value={String(year)} onValueChange={(v) => v && onYearChange(Number(v))}>
                <SelectTrigger>
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

            <Select
                value={month !== null ? String(month) : "all"}
                onValueChange={(v) => {
                    if (v === "all") {
                        onMonthChange(null);
                    } else if (v) {
                        onMonthChange(Number(v));
                    }
                }}
                items={{ all: "All Months", ...MONTH_SELECT_ITEMS }}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                            {monthNumberToName(m, "short")}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <button
                onClick={() => navigateMonth(1)}
                disabled={month === null}
                className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-30 disabled:pointer-events-none"
            >
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
        </div>
    );

    return (
        <div className="space-y-2 md:space-y-3">
            {/* Desktop: month nav on top */}
            <div className="hidden md:block">{monthNav}</div>

            {/* Filters + search — all inline */}
            <div className="flex items-center gap-2">
                <Select
                    value={source || "all"}
                    onValueChange={(v) => {
                        if (v === "all") {
                            onSourceChange(null);
                        } else if (v) {
                            onSourceChange(v);
                        }
                    }}
                    items={{ all: "Source: All", manual: "Manual", ocr: "OCR", import: "Import" }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Source: All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Source: All</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="ocr">OCR</SelectItem>
                        <SelectItem value="import">Import</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={categoryId || "all"}
                    onValueChange={(v) => {
                        if (v === "all") {
                            onCategoryChange(null);
                        } else if (v) {
                            onCategoryChange(v);
                        }
                    }}
                    items={{
                        all: "Category: All",
                        ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Category: All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Category: All</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 h-8 font-mono text-xs"
                    />
                </div>
            </div>
        </div>
    );
}
