import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Analytics } from "@vercel/analytics/next";
import "driver.js/dist/driver.css";
import "./globals.css";

const spaceGrotesk = localFont({
    src: "../fonts/SpaceGrotesk-Variable.woff2",
    variable: "--font-sans",
    weight: "300 700",
    display: "swap",
});

const spaceMono = localFont({
    src: [
        { path: "../fonts/SpaceMono-Regular.woff2", weight: "400", style: "normal" },
        { path: "../fonts/SpaceMono-Bold.woff2", weight: "700", style: "normal" },
    ],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Kha₹cha — Expense Tracker",
    icons: {
        icon: "/icon.svg",
    },
    description:
        "Track your expenses with OCR-powered screenshot analysis, detailed insights, and monthly personas.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col">
                <ThemeProvider defaultTheme="system">
                    <QueryProvider>
                        {children}
                        <Toaster />
                        <Analytics />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
