"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { monthNumberToName } from "@/lib/utils/dates";

const EXCLUDED_PATHS = ["/expenses", "/settings", "/upload"];

export function MobileMonthNav() {
    const pathname = usePathname();
    const { year, month, prevMonth, nextMonth } = useAppStore();

    if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) return null;

    return (
        <div className="md:hidden fixed bottom-[3.5rem] left-0 right-0 z-40 flex items-center justify-center gap-3 border-t-2 border-border bg-background px-4 py-2 shadow-[0_-2px_8px_0px] shadow-black/20">
            <button
                onClick={prevMonth}
                className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <span className="font-mono font-bold text-sm min-w-[100px] text-center">
                {monthNumberToName(month, "short")} {year}
            </span>
            <button
                onClick={nextMonth}
                className="rounded-md border-2 border-border bg-background p-2 hover:bg-accent transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
        </div>
    );
}
