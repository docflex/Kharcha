import { test, expect, type ConsoleMessage } from "@playwright/test";

const IGNORED_CONSOLE = [
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
    return IGNORED_CONSOLE.some((p) => msg.text().includes(p));
}

test.describe("Landing Page", () => {
    test("renders without console errors", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error" && !isIgnored(msg)) errors.push(msg.text());
        });

        const res = await page.goto("/", { waitUntil: "networkidle" });
        expect(res?.status()).toBeLessThan(500);
        expect(errors).toHaveLength(0);
    });

    test("has a visible heading or hero section", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        // Should have some prominent heading text
        const heading = page.locator("h1, h2").first();
        await expect(heading).toBeVisible();
    });

    test("has a CTA link to register or get started", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        const cta = page.getByRole("link", { name: /get started|sign up|register/i });
        if (await cta.isVisible()) {
            const href = await cta.getAttribute("href");
            expect(href).toContain("/auth/register");
        }
    });

    test("has a sign-in link", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        const signIn = page.getByRole("link", { name: /sign in|log in/i });
        if (await signIn.isVisible()) {
            const href = await signIn.getAttribute("href");
            expect(href).toContain("/auth/login");
        }
    });
});
