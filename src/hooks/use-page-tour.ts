"use client";

import { useEffect, useRef } from "react";
import { startPageTour, hasPageTourCompleted } from "@/lib/tour";
import type { TourPage } from "@/lib/tour/config";

/**
 * Auto-triggers a page-specific Driver.js tour on first visit.
 *
 * @param page  — which page tour to run
 * @param ready — set to `true` once the page is fully mounted and data is loaded
 *                so the tour targets exist in the DOM
 */
export function usePageTour(page: TourPage, ready: boolean): void {
    const triggered = useRef(false);

    useEffect(() => {
        if (!ready || triggered.current) return;
        if (hasPageTourCompleted(page)) return;

        triggered.current = true;
        const timer = setTimeout(() => startPageTour(page), 600);
        return () => clearTimeout(timer);
    }, [page, ready]);
}
