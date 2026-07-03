import type { Metadata, Viewport } from "next";
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
    description:
        "Track your expenses with OCR-powered screenshot analysis, detailed insights, and monthly personas.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Kharcha",
        startupImage: [
            {
                url: "/splash/iphone-16-pro-max.png",
                media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-16-pro.png",
                media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-14-pro-max.png",
                media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-14.png",
                media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-15-pro.png",
                media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-13-pro-max.png",
                media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-xs-max.png",
                media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-xr.png",
                media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
            },
            {
                url: "/splash/iphone-x.png",
                media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/iphone-se.png",
                media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
            },
            {
                url: "/splash/ipad-pro-12.png",
                media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
            },
            {
                url: "/splash/ipad-pro-11.png",
                media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
            },
            {
                url: "/splash/ipad-10.png",
                media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)",
            },
            {
                url: "/splash/ipad-mini-6.png",
                media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)",
            },
        ],
    },
    icons: {
        icon: "/icon.svg",
        apple: "/icons/apple-touch-icon.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#f59e0b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
