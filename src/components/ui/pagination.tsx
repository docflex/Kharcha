"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    pageSize?: number;
}

export function Pagination({
    page,
    totalPages,
    onPageChange,
    totalItems,
    pageSize,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const start = totalItems ? (page - 1) * (pageSize ?? 0) + 1 : null;
    const end = totalItems ? Math.min(page * (pageSize ?? 0), totalItems) : null;

    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3">
            {/* Item count */}
            <span className="text-xs font-mono text-muted-foreground">
                {totalItems && start && end
                    ? `${start}–${end} of ${totalItems}`
                    : `Page ${page} of ${totalPages}`}
            </span>

            {/* Controls */}
            <div className="flex items-center gap-1">
                <PaginationButton
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    aria-label="First page"
                >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                </PaginationButton>
                <PaginationButton
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </PaginationButton>

                {/* Page numbers */}
                {getPageNumbers(page, totalPages).map((p, i) =>
                    p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                            …
                        </span>
                    ) : (
                        <PaginationButton
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            active={p === page}
                        >
                            {p}
                        </PaginationButton>
                    )
                )}

                <PaginationButton
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Next page"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </PaginationButton>
                <PaginationButton
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                    aria-label="Last page"
                >
                    <ChevronsRight className="h-3.5 w-3.5" />
                </PaginationButton>
            </div>
        </div>
    );
}

function PaginationButton({
    children,
    onClick,
    disabled,
    active,
    ...props
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex h-8 min-w-8 items-center justify-center rounded-md border-2 px-2 text-xs font-bold transition-all ${
                active
                    ? "border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0px_0px] shadow-foreground"
                    : disabled
                      ? "border-border bg-background text-muted-foreground/40 cursor-not-allowed"
                      : "border-border bg-background text-foreground hover:bg-accent shadow-[1px_1px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
            }`}
            {...props}
        >
            {children}
        </button>
    );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | "...")[] = [1];

    if (current > 3) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push("...");

    pages.push(total);
    return pages;
}
