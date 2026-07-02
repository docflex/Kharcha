"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
    LayoutDashboard,
    Upload,
    Wallet,
    BarChart3,
    UserCircle,
    Settings,
    Target,
    IndianRupee,
    Sun,
    Moon,
    ArrowLeftRight,
    Loader2,
    AlertTriangle,
    LogOut,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/currency-context";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

const primaryNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Wallet },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/persona", label: "Persona", icon: UserCircle },
];

const settingsNav = [
    { href: "/settings/income", label: "Income", icon: IndianRupee },
    { href: "/settings/budgets", label: "Budgets", icon: Target },
];

function NavLink({
    item,
    isActive,
}: {
    item: {
        href: string;
        label: string;
        icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    };
    isActive: boolean;
}) {
    return (
        <Link
            href={item.href}
            className={cn(
                "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-bold transition-all",
                isActive
                    ? "bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border-2 border-transparent hover:border-border"
            )}
        >
            <item.icon className="h-4 w-4" strokeWidth={2.5} />
            {item.label}
            {isActive && (
                <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(100%+0.75rem)] h-6 w-1 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
            )}
        </Link>
    );
}

interface SidebarProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const { setTheme, theme } = useTheme();
    const { currency, setCurrency, loading: ratesLoading, error: ratesError } = useCurrency();
    const currentCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currency);

    return (
        <aside className="hidden md:flex md:w-64 md:flex-col border-r-2 border-border bg-card h-screen sticky top-0 overflow-hidden">
            {/* Logo */}
            <div className="flex h-16 items-center border-b-2 border-border px-6 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-sm border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground group-hover:shadow-[3px_3px_0px_0px] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-all">
                        ₹
                    </div>
                    <span className="text-lg font-black tracking-tight uppercase">Kha₹cha</span>
                </Link>
            </div>

            {/* Nav */}
            <nav data-tour="sidebar-nav" className="flex-1 space-y-0.5 p-3 overflow-y-auto">
                {primaryNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return <NavLink key={item.href} item={item} isActive={isActive} />;
                })}
            </nav>

            {/* Settings section */}
            <div className="border-t border-border/50 px-3 py-2 space-y-0.5 shrink-0">
                {settingsNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return <NavLink key={item.href} item={item} isActive={isActive} />;
                })}
            </div>

            {/* Upload CTA */}
            <div data-tour="upload-cta" className="px-3 pb-2 shrink-0">
                <Link
                    href="/upload"
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition-all border-2",
                        pathname === "/upload" || pathname.startsWith("/upload/")
                            ? "bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0px_0px] shadow-foreground"
                            : "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:border-primary shadow-[2px_2px_0px_0px] shadow-primary/20"
                    )}
                >
                    <Upload className="h-4 w-4" strokeWidth={2.5} />
                    Upload
                </Link>
            </div>

            {/* Controls footer: currency + theme + user */}
            <div className="border-t-2 border-border px-3 py-3 space-y-2 shrink-0">
                {/* Currency + Theme row */}
                <div className="flex items-center gap-2">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                            render={
                                <button
                                    data-tour="currency-selector"
                                    className={`flex h-8 flex-1 items-center gap-1.5 rounded-md border-2 bg-card px-2.5 text-xs font-bold hover:bg-muted transition-colors ${
                                        ratesError
                                            ? "border-destructive text-destructive"
                                            : "border-border"
                                    }`}
                                >
                                    {ratesLoading ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : ratesError ? (
                                        <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                                    ) : (
                                        <ArrowLeftRight className="h-3 w-3" strokeWidth={2.5} />
                                    )}
                                    <span className="font-mono">
                                        {currentCurrency?.symbol ?? "₹"} {currency}
                                    </span>
                                </button>
                            }
                        />
                        <DropdownMenuContent
                            align="start"
                            side="right"
                            sideOffset={8}
                            className="w-52 border-2 border-border"
                        >
                            {ratesError && (
                                <>
                                    <div className="flex items-start gap-2 p-2 text-destructive">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p className="text-xs">{ratesError}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {SUPPORTED_CURRENCIES.map((c) => {
                                const disabled = c.code !== "INR" && !!ratesError;
                                return (
                                    <DropdownMenuItem
                                        key={c.code}
                                        onClick={() => !disabled && setCurrency(c.code)}
                                        className={`${
                                            currency === c.code ? "bg-primary/10 font-bold" : ""
                                        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                                    >
                                        <span className="mr-2 w-6 text-center font-mono text-sm">
                                            {c.symbol}
                                        </span>
                                        <span className="flex-1">{c.name}</span>
                                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                                            {c.code}
                                        </span>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                        data-tour="theme-toggle"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-border bg-card hover:bg-muted transition-colors"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </button>
                </div>

                {/* User row */}
                {user && (
                    <div className="flex items-center gap-2 rounded-md border-2 border-border bg-card px-2.5 py-1.5">
                        <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-black">
                                {user.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{user.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>
                        <Link
                            href="/settings"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors"
                            title="Settings"
                        >
                            <Settings className="h-3 w-3 text-muted-foreground" strokeWidth={2.5} />
                        </Link>
                        <Dialog>
                            <DialogTrigger
                                render={
                                    <button
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                                        title="Sign out"
                                    />
                                }
                            >
                                <LogOut
                                    className="h-3 w-3 text-muted-foreground"
                                    strokeWidth={2.5}
                                />
                            </DialogTrigger>
                            <DialogContent className="border-2 border-border bg-card sm:max-w-xs">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-black uppercase tracking-tight">
                                        Sign Out
                                    </DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to sign out?
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose render={<Button variant="outline" size="sm" />}>
                                        Cancel
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            signOut({ callbackUrl: "/auth/login" });
                                        }}
                                    >
                                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                        Sign Out
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>
        </aside>
    );
}
