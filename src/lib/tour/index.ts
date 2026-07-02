import { driver } from "driver.js";
import { PAGE_TOURS, type TourPage } from "./config";

const TOUR_KEY_PREFIX = "kharcha:tour:";
const LEGACY_KEY = "kharcha:tour-completed";

/* ─── Per-page completion tracking ───────────────────────────────────────── */

function tourKey(page: TourPage): string {
    return `${TOUR_KEY_PREFIX}${page}`;
}

export function hasPageTourCompleted(page: TourPage): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(tourKey(page)) === "true";
}

export function markPageTourComplete(page: TourPage): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(tourKey(page), "true");
}

export function resetPageTour(page: TourPage): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(tourKey(page));
}

export function resetAllTours(): void {
    if (typeof window === "undefined") return;
    const pages: TourPage[] = ["dashboard", "expenses", "upload", "analytics", "persona"];
    pages.forEach((p) => localStorage.removeItem(tourKey(p)));
    localStorage.removeItem(LEGACY_KEY);
}

/* ─── Legacy compat — old code references these ──────────────────────────── */

export function hasCompletedTour(): boolean {
    return hasPageTourCompleted("dashboard");
}

export function resetTour(): void {
    resetAllTours();
}

/* ─── Start a page-specific tour ─────────────────────────────────────────── */

export function startPageTour(page: TourPage): void {
    const config = PAGE_TOURS[page];
    if (!config) return;

    const isMobile = window.innerWidth < 768;
    const steps = isMobile ? config.mobile : config.desktop;
    if (steps.length === 0) return;

    const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.7)",
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: "kharcha-tour-popover",
        steps,
        onDestroyStarted: () => {
            markPageTourComplete(page);
            driverObj.destroy();
        },
    });

    driverObj.drive();
}

export function startTour(): void {
    startPageTour("dashboard");
}
