"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/providers/theme-provider";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Sun,
    Moon,
    Settings,
    LogOut,
    ArrowLeftRight,
    Loader2,
    AlertTriangle,
    Eye,
    EyeOff,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useAppStore } from "@/stores/app-store";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function Header({ user }: HeaderProps) {
    const { setTheme, theme } = useTheme();
    const { currency, setCurrency, loading: ratesLoading, error: ratesError } = useCurrency();
    const { privacyMode, togglePrivacy } = useAppStore();
    const [signOutOpen, setSignOutOpen] = useState(false);
    const currentCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currency);

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b-2 border-border bg-card/80 backdrop-blur-sm px-4 md:hidden">
            {/* Mobile: logo */}
            <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-xs border-2 border-foreground shadow-[1px_1px_0px_0px] shadow-foreground">
                    ₹
                </div>
                <span className="text-sm font-black tracking-tight uppercase">Kha₹cha</span>
            </Link>

            {/* Right side: currency + theme toggle + user */}
            <div className="flex items-center gap-2">
                {/* Currency selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <button
                                className={`flex h-8 items-center gap-1.5 rounded-md border-2 bg-card px-2.5 text-xs font-bold hover:bg-muted transition-colors ${
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
                    <DropdownMenuContent align="end" className="w-52 border-2 border-border">
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

                {/* Privacy toggle */}
                <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 border-2 ${
                        privacyMode
                            ? "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                            : "border-border"
                    }`}
                    onClick={togglePrivacy}
                    title={
                        privacyMode ? "Privacy mode on — click to reveal" : "Click to hide amounts"
                    }
                >
                    {privacyMode ? (
                        <EyeOff className="h-4 w-4 text-amber-500" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle privacy</span>
                </Button>

                {/* Theme toggle */}
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-2 border-border"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>

                {/* User menu */}
                {user ? (
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <button className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-border bg-card hover:bg-muted transition-colors overflow-hidden" />
                                }
                            >
                                <Avatar className="h-7 w-7">
                                    <AvatarImage
                                        src={user.image || undefined}
                                        alt={user.name || "User"}
                                    />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-black">
                                        {user.name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-56 border-2 border-border"
                            >
                                <div className="flex items-center gap-2 p-2">
                                    <div className="flex flex-col space-y-0.5">
                                        <p className="text-sm font-bold">{user.name}</p>
                                        <p className="text-xs font-mono text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Link
                                        href="/settings/profile"
                                        className="flex items-center w-full"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setSignOutOpen(true)}
                                    className="text-destructive"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
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
                    </>
                ) : (
                    <Button
                        variant="default"
                        size="sm"
                        className="border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground font-bold hover:shadow-[3px_3px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                        render={<Link href="/auth/login" />}
                    >
                        Sign in
                    </Button>
                )}
            </div>
        </header>
    );
}
