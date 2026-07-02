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
}: ExpenseFiltersProps) {
    function navigateMonth(direction: -1 | 1) {
        if (month === null) return;
        let newMonth = month + direction;
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

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {/* Prev month */}
                <button
                    onClick={() => navigateMonth(-1)}
                    disabled={month === null}
                    className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-30 disabled:pointer-events-none"
                >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                </button>

                {/* Year filter */}
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

                {/* Month filter */}
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

                {/* Next month */}
                <button
                    onClick={() => navigateMonth(1)}
                    disabled={month === null}
                    className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-30 disabled:pointer-events-none"
                >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>

                {/* Source filter */}
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

                {/* Category filter */}
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
            </div>

            {/* Search input */}
            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by category or notes..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-9 font-mono text-sm"
                />
            </div>
        </div>
    );
}
