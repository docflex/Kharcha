import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Smoke test: visits every public and authenticated route and asserts
 * that no console errors are emitted. This catches hydration mismatches,
 * missing modules, runtime crashes, and unhandled promise rejections.
 *
 * Authenticated pages will redirect to /auth/login — that's expected.
 * We still capture console output on the redirected page.
 */

const PUBLIC_ROUTES = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
];

const AUTH_ROUTES = [
    "/dashboard",
    "/upload",
    "/expenses",
    "/analytics",
    "/persona",
    "/settings",
    "/settings/income",
    "/settings/budgets",
    "/settings/email",
    "/settings/profile",
    "/onboarding",
];

const ALL_ROUTES = [...PUBLIC_ROUTES, ...AUTH_ROUTES];

// Console messages to ignore (not real errors)
const IGNORED_PATTERNS = [
    "Download the React DevTools",
    "Third-party cookie",
    "favicon.ico",
    "[Fast Refresh]",
    "webpack-hmr",
    "turbopack-hmr",
    "[HMR]",
    "401 (Unauthorized)",
];

function isIgnored(msg: ConsoleMessage): boolean {
    const text = msg.text();
    return IGNORED_PATTERNS.some((p) => text.includes(p));
}

test.describe("Console Health — Zero Errors", () => {
    for (const route of ALL_ROUTES) {
        test(`no console errors on ${route}`, async ({ page }) => {
            const errors: string[] = [];

            page.on("console", (msg) => {
                if (msg.type() === "error" && !isIgnored(msg)) {
                    errors.push(`[console.error] ${msg.text()}`);
                }
            });

            page.on("pageerror", (err) => {
                errors.push(`[pageerror] ${err.message}`);
            });

            const response = await page.goto(route, {
                waitUntil: "networkidle",
                timeout: 15000,
            });

            // Page should load (200 or redirect)
            expect(response?.status()).toBeLessThan(500);

            // Wait a beat for any async errors
            await page.waitForTimeout(1000);

            // Assert zero errors
            if (errors.length > 0) {
                console.log(`Errors on ${route}:\n${errors.join("\n")}`);
            }
            expect(errors, `Console errors found on ${route}`).toHaveLength(0);
        });
    }
});

test.describe("Console Health — No Hydration Warnings", () => {
    for (const route of PUBLIC_ROUTES) {
        test(`no hydration mismatch on ${route}`, async ({ page }) => {
            const warnings: string[] = [];

            page.on("console", (msg) => {
                const text = msg.text();
                if (
                    msg.type() === "warning" &&
                    (text.includes("hydrat") || text.includes("Hydrat"))
                ) {
                    warnings.push(text);
                }
            });

            await page.goto(route, { waitUntil: "networkidle", timeout: 15000 });
            await page.waitForTimeout(1000);

            expect(warnings, `Hydration warnings found on ${route}`).toHaveLength(0);
        });
    }
});
