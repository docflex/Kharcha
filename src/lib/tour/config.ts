import type { DriveStep } from "driver.js";

export type TourPage = "dashboard" | "expenses" | "upload" | "analytics" | "persona";

export interface PageTourConfig {
    desktop: DriveStep[];
    mobile: DriveStep[];
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */

const dashboardDesktop: DriveStep[] = [
    {
        element: "[data-tour='sidebar-nav']",
        popover: {
            title: "Navigation",
            description: "Jump between Dashboard, Expenses, Analytics, Persona, and more.",
            side: "right",
            align: "start",
        },
    },
    {
        element: "[data-tour='bento-grid']",
        popover: {
            title: "Your Spending at a Glance",
            description: "Bento cards show expenses, income, savings pulse, and budget status.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='month-selector']",
        popover: {
            title: "Month Navigation",
            description:
                "Use arrows or dropdowns to view any month. The eye icon toggles investments.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='currency-selector']",
        popover: {
            title: "Currency Conversion",
            description: "View amounts in USD, EUR, GBP, or 6 other currencies.",
            side: "right",
            align: "center",
        },
    },
    {
        element: "[data-tour='theme-toggle']",
        popover: {
            title: "Dark / Light Mode",
            description: "Switch themes to match your preference.",
            side: "right",
            align: "center",
        },
    },
];

const dashboardMobile: DriveStep[] = [
    {
        element: "[data-tour='bottom-nav']",
        popover: {
            title: "Navigation",
            description: "Tap to switch between Home, Expenses, Upload, Analytics, and More.",
            side: "top",
            align: "center",
        },
    },
    {
        element: "[data-tour='bento-grid']",
        popover: {
            title: "Your Spending Overview",
            description: "Cards show expenses, income, savings pulse, and budget status.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='quick-add-fab']",
        popover: {
            title: "Quick Add",
            description: "Tap the + button to quickly add expenses or upload screenshots.",
            side: "left",
            align: "center",
        },
    },
];

/* ─── Expenses ───────────────────────────────────────────────────────────── */

const expensesDesktop: DriveStep[] = [
    {
        element: "[data-tour='expense-actions']",
        popover: {
            title: "Export & Add",
            description: "Export to Excel/CSV, or add expenses manually with the Add button.",
            side: "bottom",
            align: "end",
        },
    },
    {
        element: "[data-tour='expense-filters']",
        popover: {
            title: "Smart Filters",
            description: "Filter by year, month, category, source, or search by text.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='expense-table']",
        popover: {
            title: "Your Expenses",
            description:
                "Click column headers to sort. Select rows with checkboxes for bulk delete or re-categorize.",
            side: "top",
            align: "center",
        },
    },
];

const expensesMobile: DriveStep[] = [
    {
        element: "[data-tour='expense-actions']",
        popover: {
            title: "Export & Add",
            description: "Export data or add expenses manually.",
            side: "bottom",
            align: "end",
        },
    },
    {
        element: "[data-tour='expense-table']",
        popover: {
            title: "Your Expenses",
            description: "Tap an expense to edit. Use checkboxes for bulk actions.",
            side: "top",
            align: "center",
        },
    },
];

/* ─── Upload ─────────────────────────────────────────────────────────────── */

const uploadDesktop: DriveStep[] = [
    {
        element: "[data-tour='upload-month-picker']",
        popover: {
            title: "Select Month & Year",
            description: "Choose which month these screenshots belong to before uploading.",
            side: "bottom",
            align: "start",
        },
    },
    {
        element: "[data-tour='upload-dropzone']",
        popover: {
            title: "Drag & Drop Screenshots",
            description:
                "Drop up to 5 Buddy app screenshots. OCR extracts categories and amounts automatically.",
            side: "top",
            align: "center",
        },
    },
];

const uploadMobile: DriveStep[] = [
    {
        element: "[data-tour='upload-dropzone']",
        popover: {
            title: "Upload Screenshots",
            description:
                "Tap to select Buddy app screenshots. OCR extracts expenses automatically.",
            side: "top",
            align: "center",
        },
    },
];

/* ─── Analytics ──────────────────────────────────────────────────────────── */

const analyticsDesktop: DriveStep[] = [
    {
        element: "[data-tour='analytics-tabs']",
        popover: {
            title: "Chart Views",
            description:
                "Switch between Breakdown, Month-over-Month, Trends, Heatmap, and Year-over-Year.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='analytics-insights']",
        popover: {
            title: "Auto Insights",
            description:
                "Auto-generated callouts highlight top spending patterns and savings trends.",
            side: "bottom",
            align: "start",
        },
    },
];

const analyticsMobile: DriveStep[] = [
    {
        element: "[data-tour='analytics-tabs']",
        popover: {
            title: "Swipe Between Charts",
            description: "Scroll tabs to switch between Breakdown, MoM, Trends, Heatmap, and YoY.",
            side: "bottom",
            align: "center",
        },
    },
];

/* ─── Persona ────────────────────────────────────────────────────────────── */

const personaDesktop: DriveStep[] = [
    {
        element: "[data-tour='persona-card']",
        popover: {
            title: "Your Spending Persona",
            description:
                "Each month you get a personality archetype based on your spending patterns.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='persona-details']",
        popover: {
            title: "Insights & Recommendations",
            description: "Actionable insights and cut-back or spend-more suggestions.",
            side: "top",
            align: "center",
        },
    },
];

const personaMobile: DriveStep[] = [
    {
        element: "[data-tour='persona-card']",
        popover: {
            title: "Your Spending Persona",
            description: "A personality archetype generated from your monthly spending.",
            side: "bottom",
            align: "center",
        },
    },
];

/* ─── Exports ────────────────────────────────────────────────────────────── */

export const PAGE_TOURS: Record<TourPage, PageTourConfig> = {
    dashboard: { desktop: dashboardDesktop, mobile: dashboardMobile },
    expenses: { desktop: expensesDesktop, mobile: expensesMobile },
    upload: { desktop: uploadDesktop, mobile: uploadMobile },
    analytics: { desktop: analyticsDesktop, mobile: analyticsMobile },
    persona: { desktop: personaDesktop, mobile: personaMobile },
};
