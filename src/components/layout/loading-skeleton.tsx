"use client";

import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
    className?: string;
    lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
    return (
        <div className={cn("space-y-4 py-8", className)}>
            {/* Title skeleton */}
            <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded-md bg-muted animate-pulse" />

            {/* Card skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className="h-32 rounded-lg border-2 border-border bg-muted/50 animate-pulse"
                        style={{ animationDelay: `${i * 150}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-2 py-4">
            {/* Header skeleton */}
            <div className="flex gap-4 px-4 py-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            </div>
            {/* Row skeletons */}
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="flex gap-4 px-4 py-3 border-b border-border"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export function ChartSkeleton({
    height = 280,
    className,
}: {
    height?: number;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "rounded-lg border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px] shadow-border/50",
                className
            )}
        >
            <div className="h-4 w-40 rounded bg-muted animate-pulse mb-4" />
            <div
                className="rounded-md bg-muted/50 animate-pulse flex items-end justify-center gap-2 px-4 pb-4"
                style={{ height }}
            >
                {[65, 40, 80, 55, 35, 70].map((h, i) => (
                    <div
                        key={i}
                        className="w-8 rounded-t bg-muted animate-pulse"
                        style={{
                            height: `${h}%`,
                            animationDelay: `${i * 100}ms`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export function CardSkeleton({ count = 3, className }: { count?: number; className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="h-4 w-24 rounded bg-muted mb-3" />
                    <div className="h-6 w-32 rounded bg-muted mb-2" />
                    <div className="h-3 w-20 rounded bg-muted" />
                </div>
            ))}
        </div>
    );
}
