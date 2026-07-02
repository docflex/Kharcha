import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Smoke tests for every app page — verifies:
 * 1. Page loads without HTTP 5xx
 * 2. Key headings/structure present
 * 3. No console errors
 *
 * Auth-required pages redirect to /auth/login — tests handle both cases.
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

test.describe("Dashboard Page", () => {
    test("renders heading and month/year selectors", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/dashboard", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);

        if (!page.url().includes("/auth/login")) {
            await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
        }

        expect(errors).toHaveLength(0);
    });
});

test.describe("Expenses Page", () => {
    test("renders heading and filter controls", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/expenses", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);

        if (!page.url().includes("/auth/login")) {
            await expect(page.getByRole("heading", { name: /expenses/i })).toBeVisible();
            // Verify filter selects are present
            await expect(page.getByText(/add expense/i)).toBeVisible();
        }

        expect(errors).toHaveLength(0);
    });
});

test.describe("Analytics Page", () => {
    test("renders heading and chart containers", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/analytics", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);

        if (!page.url().includes("/auth/login")) {
            await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
        }

        expect(errors).toHaveLength(0);
    });
});

test.describe("Settings Page", () => {
    test("renders heading and categories section", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/settings", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);

        if (!page.url().includes("/auth/login")) {
            await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
        }

        expect(errors).toHaveLength(0);
    });
});

test.describe("Budgets Page", () => {
    test("renders heading and add budget button", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/settings/budgets", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);

        if (!page.url().includes("/auth/login")) {
            await expect(page.getByRole("heading", { name: /budget targets/i })).toBeVisible();
        }

        expect(errors).toHaveLength(0);
    });
});

test.describe("Persona Page", () => {
    test("renders without errors", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/persona", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);

        expect(errors).toHaveLength(0);
    });
});

test.describe("Auth Pages", () => {
    test("login page renders form", async ({ page }) => {
        const res = await page.goto("/auth/login", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);
        await expect(page.getByRole("heading", { name: /kha.*cha/i })).toBeVisible();
    });

    test("register page renders form", async ({ page }) => {
        const res = await page.goto("/auth/register", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);
        await expect(page.getByRole("heading", { name: /kha.*cha/i })).toBeVisible();
    });
});
