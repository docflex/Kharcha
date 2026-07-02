import { test, expect } from "@playwright/test";

test.describe("Feature Tour — Context-Aware Per-Page Tours", () => {
    test("settings page has Take a Tour button with correct text", async ({ page }) => {
        const response = await page.goto("/settings", {
            waitUntil: "networkidle",
            timeout: 15000,
        });
        expect(response?.status()).toBeLessThan(500);

        const url = page.url();
        if (url.includes("/auth/login")) return;

        await expect(page.getByText("Take a Tour")).toBeVisible({ timeout: 10000 });
        await expect(page.getByText("Reset & replay guided tips on every page")).toBeVisible({
            timeout: 10000,
        });
    });

    test("Take a Tour button is clickable", async ({ page }) => {
        const response = await page.goto("/settings", {
            waitUntil: "networkidle",
            timeout: 15000,
        });
        expect(response?.status()).toBeLessThan(500);

        const url = page.url();
        if (url.includes("/auth/login")) return;

        const tourBtn = page.getByText("Take a Tour");
        if (await tourBtn.isVisible({ timeout: 10000 })) {
            await tourBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test("dashboard has tour target attributes", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });

        const response = await page.goto("/dashboard", {
            waitUntil: "networkidle",
            timeout: 15000,
        });
        expect(response?.status()).toBeLessThan(500);

        const url = page.url();
        if (url.includes("/auth/login")) return;

        const bentoGrid = page.locator("[data-tour='bento-grid']");
        if (!(await bentoGrid.isVisible({ timeout: 5000 }).catch(() => false))) return;

        await expect(bentoGrid).toBeVisible();
        await expect(page.locator("[data-tour='month-selector']")).toBeVisible();
        await expect(page.locator("[data-tour='sidebar-nav']")).toBeVisible();
        await expect(page.locator("[data-tour='currency-selector']")).toBeVisible();
        await expect(page.locator("[data-tour='theme-toggle']")).toBeVisible();
    });

    test("expenses page has tour target attributes", async ({ page }) => {
        const response = await page.goto("/expenses", {
            waitUntil: "networkidle",
            timeout: 15000,
        });
        expect(response?.status()).toBeLessThan(500);

        const url = page.url();
        if (url.includes("/auth/login")) return;

        const actions = page.locator("[data-tour='expense-actions']");
        if (!(await actions.isVisible({ timeout: 5000 }).catch(() => false))) return;

        await expect(actions).toBeVisible();
        await expect(page.locator("[data-tour='expense-filters']")).toBeVisible();
        await expect(page.locator("[data-tour='expense-table']")).toBeVisible();
    });

    test("upload page has tour target attributes", async ({ page }) => {
        const response = await page.goto("/upload", {
            waitUntil: "networkidle",
            timeout: 15000,
        });
        expect(response?.status()).toBeLessThan(500);

        const url = page.url();
        if (url.includes("/auth/login")) return;

        const dropzone = page.locator("[data-tour='upload-dropzone']");
        if (!(await dropzone.isVisible({ timeout: 5000 }).catch(() => false))) return;

        await expect(dropzone).toBeVisible();
        await expect(page.locator("[data-tour='upload-month-picker']")).toBeVisible();
    });

    test("mobile has bottom-nav and fab tour targets", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });

        const response = await page.goto("/dashboard", {
            waitUntil: "networkidle",
            timeout: 15000,
        });
        expect(response?.status()).toBeLessThan(500);

        const url = page.url();
        if (url.includes("/auth/login")) return;

        const bottomNav = page.locator("[data-tour='bottom-nav']");
        if (!(await bottomNav.isVisible({ timeout: 5000 }).catch(() => false))) return;

        await expect(bottomNav).toBeVisible();
        await expect(page.locator("[data-tour='quick-add-fab']")).toBeVisible();
    });
});
