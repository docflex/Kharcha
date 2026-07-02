// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
    renderUploadReminder,
    renderDashboardReady,
    type UploadReminderData,
    type DashboardReadyData,
} from "@/lib/email/templates";

describe("Email Templates", () => {
    describe("renderUploadReminder", () => {
        const data: UploadReminderData = {
            userName: "Rehber",
            targetMonth: "June",
            targetYear: 2026,
            appUrl: "http://localhost:3000",
            previousMonthStats: {
                totalSpend: 125000,
                topCategories: [
                    { name: "Rent", amount: 15000 },
                    { name: "Food", amount: 9824.8 },
                    { name: "Groceries", amount: 8066.39 },
                ],
                savingsRate: 28.5,
            },
        };

        it("renders valid HTML", () => {
            const html = renderUploadReminder(data);
            expect(html).toContain("<!DOCTYPE html>");
            expect(html).toContain("</html>");
        });

        it("includes user name", () => {
            const html = renderUploadReminder(data);
            expect(html).toContain("Rehber");
        });

        it("includes target month and year", () => {
            const html = renderUploadReminder(data);
            expect(html).toContain("June");
            expect(html).toContain("2026");
        });

        it("includes upload link", () => {
            const html = renderUploadReminder(data);
            expect(html).toContain("http://localhost:3000/upload");
        });

        it("includes previous month stats when provided", () => {
            const html = renderUploadReminder(data);
            expect(html).toContain("₹1,25,000");
            expect(html).toContain("Rent");
            expect(html).toContain("₹15,000");
            expect(html).toContain("28.5%");
        });

        it("works without previous month stats", () => {
            const dataWithout: UploadReminderData = {
                userName: "Rehber",
                targetMonth: "June",
                targetYear: 2026,
                appUrl: "http://localhost:3000",
            };
            const html = renderUploadReminder(dataWithout);
            expect(html).toContain("<!DOCTYPE html>");
            expect(html).toContain("Rehber");
            expect(html).not.toContain("Last month");
        });

        it("includes the Kharcha branding", () => {
            const html = renderUploadReminder(data);
            expect(html).toContain("Kharcha");
        });
    });

    describe("renderDashboardReady", () => {
        const data: DashboardReadyData = {
            userName: "Rehber",
            month: "February",
            year: 2026,
            appUrl: "http://localhost:3000",
            totalSpend: 285000,
            topCategories: [
                { name: "Investments", amount: 200077 },
                { name: "Rent", amount: 15000 },
                { name: "Food", amount: 9824.8 },
            ],
            savingsRate: 32.1,
            personaName: "The Optimizer",
            personaEmoji: "🧘",
        };

        it("renders valid HTML", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("<!DOCTYPE html>");
            expect(html).toContain("</html>");
        });

        it("includes user name", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("Rehber");
        });

        it("includes month and year", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("February");
            expect(html).toContain("2026");
        });

        it("includes total spend formatted in INR", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("₹2,85,000");
        });

        it("includes top 3 categories", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("Investments");
            expect(html).toContain("₹2,00,077");
            expect(html).toContain("Rent");
            expect(html).toContain("Food");
        });

        it("includes savings rate", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("32.1%");
        });

        it("includes persona teaser", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("The Optimizer");
            expect(html).toContain("🧘");
        });

        it("includes links to dashboard and persona", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("http://localhost:3000/dashboard");
            expect(html).toContain("http://localhost:3000/persona");
        });

        it("works without persona data", () => {
            const dataWithout: DashboardReadyData = {
                userName: "Rehber",
                month: "February",
                year: 2026,
                appUrl: "http://localhost:3000",
                totalSpend: 285000,
                topCategories: [{ name: "Rent", amount: 15000 }],
                savingsRate: 32.1,
            };
            const html = renderDashboardReady(dataWithout);
            expect(html).toContain("<!DOCTYPE html>");
            expect(html).not.toContain("spending persona");
        });

        it("includes Kharcha branding", () => {
            const html = renderDashboardReady(data);
            expect(html).toContain("Kharcha");
        });
    });
});
