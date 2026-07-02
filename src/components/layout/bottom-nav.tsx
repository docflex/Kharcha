"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Upload,
    Wallet,
    BarChart3,
    MoreHorizontal,
    UserCircle,
    Settings,
    IndianRupee,
    Target,
} from "lucide-react";
import { motion } from "motion/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const tabs = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Wallet },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const moreItems = [
    { href: "/persona", label: "Persona", icon: UserCircle },
    { href: "/settings/income", label: "Income", icon: IndianRupee },
    { href: "/settings/budgets", label: "Budgets", icon: Target },
    { href: "/settings", label: "Settings", icon: Settings },
];

const morePaths = moreItems.map((i) => i.href);

export function BottomNav() {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);

    const isMoreActive = morePaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

    return (
        <>
            <nav data-tour="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                <div className="border-t-2 border-border bg-background/95 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-lg items-center justify-around px-2">
                        {tabs.map((tab) => {
                            const isActive =
                                pathname === tab.href || pathname.startsWith(tab.href + "/");
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="bottom-nav-indicator"
                                            className="absolute -top-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 35,
                                            }}
                                        />
                                    )}
                                    <tab.icon
                                        className={cn(
                                            "h-5 w-5 transition-transform",
                                            isActive && "scale-110"
                                        )}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    <span>{tab.label}</span>
                                </Link>
                            );
                        })}

                        {/* More button — opens sheet */}
                        <button
                            onClick={() => setMoreOpen(true)}
                            className={cn(
                                "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors",
                                isMoreActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {isMoreActive && (
                                <motion.div
                                    layoutId="bottom-nav-indicator"
                                    className="absolute -top-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 35,
                                    }}
                                />
                            )}
                            <MoreHorizontal
                                className={cn(
                                    "h-5 w-5 transition-transform",
                                    isMoreActive && "scale-110"
                                )}
                                strokeWidth={isMoreActive ? 2.5 : 2}
                            />
                            <span>More</span>
                        </button>
                    </div>
                    {/* Safe area for iPhone notch */}
                    <div className="h-[env(safe-area-inset-bottom)]" />
                </div>
            </nav>

            {/* More sheet */}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="rounded-t-2xl border-t-2 border-border pb-[calc(1rem+env(safe-area-inset-bottom))]"
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-2 pb-1">
                        <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                    </div>
                    <SheetHeader className="px-4 pb-2">
                        <SheetTitle className="text-sm font-black uppercase tracking-widest">
                            More
                        </SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                        {moreItems.map((item) => {
                            const isActive =
                                item.href === "/settings"
                                    ? pathname === "/settings" ||
                                      pathname === "/settings/email" ||
                                      pathname === "/settings/profile"
                                    : pathname === item.href ||
                                      pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all",
                                        isActive
                                            ? "border-primary bg-primary/10 text-primary shadow-[2px_2px_0px_0px] shadow-primary/30"
                                            : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" strokeWidth={2.5} />
                                    <span className="text-[11px] font-bold leading-tight">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
