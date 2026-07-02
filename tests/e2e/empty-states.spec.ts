import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Verifies that data pages render properly with no data (empty states).
 * Auth-required pages redirect to /auth/login — tests verify no crash occurs.
 */

const IGNORED_CONSOLE = [
    "Download the React DevTools",
    "Third-party cookie",
    "favicon.ico",
    "[Fast Refresh]",
    "webpack-hmr",
    "turbopack-hmr",
    "[HMR]",
];

function isIgnored(msg: ConsoleMessage): boolean {
    return IGNORED_CONSOLE.some((p) => msg.text().includes(p));
}

const DATA_PAGES = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/expenses", label: "Expenses" },
    { path: "/analytics", label: "Analytics" },
    { path: "/persona", label: "Persona" },
    { path: "/settings", label: "Settings (Categories)" },
    { path: "/settings/budgets", label: "Budgets" },
];

test.describe("Empty States — Pages Load With No Data", () => {
    for (const { path, label } of DATA_PAGES) {
        test(`${label} (${path}) loads without console errors`, async ({ page }) => {
            const errors: string[] = [];
            page.on("console", (msg) => {
                if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
            });

            const res = await page.goto(path, {
                waitUntil: "networkidle",
                timeout: 15000,
            });

            expect(res?.status()).toBeLessThan(500);
            await page.waitForTimeout(1000);
            expect(errors, `Console errors on ${path}`).toHaveLength(0);
        });
    }
});
