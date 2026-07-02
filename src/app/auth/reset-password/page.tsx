"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, ArrowRight, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const { setTheme, theme } = useTheme();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!token) {
            setError("Invalid reset link — no token found");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
            } else {
                setSuccess(true);
            }
        } catch (_error) {
            setError("Network error — please try again");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Theme toggle */}
            <div className="absolute right-4 top-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-2 border-border"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
            </div>

            <div className="flex flex-1 items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" as const }}
                    className="w-full max-w-sm"
                >
                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: 0.1,
                            }}
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground border-3 border-foreground shadow-[4px_4px_0px_0px] shadow-foreground text-2xl font-black"
                        >
                            ₹
                        </motion.div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">
                            New Password
                        </h1>
                        <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
                            Set your new password
                        </p>
                    </div>

                    {/* Card */}
                    <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px] shadow-border/50">
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4"
                            >
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10">
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                </div>
                                <p className="text-sm font-bold">Password reset successfully!</p>
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline underline-offset-2"
                                >
                                    Sign in with your new password
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {!token && (
                                    <div className="rounded-md border-2 border-amber-500 bg-amber-500/10 p-3 text-sm font-bold text-amber-600 dark:text-amber-400">
                                        No reset token found in URL. Please use the link from your
                                        email.
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs font-bold uppercase tracking-widest"
                                    >
                                        New Password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Min 8 chars, uppercase, lowercase, digit, special char
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="confirmPassword"
                                        className="text-xs font-bold uppercase tracking-widest"
                                    >
                                        Confirm Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-10 border-2 border-foreground shadow-[3px_3px_0px_0px] shadow-foreground font-black uppercase tracking-wider text-xs hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                    disabled={loading || !token}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <motion.span
                                                animate={{ rotate: 360 }}
                                                transition={{
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    ease: "linear",
                                                }}
                                                className="inline-block h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full"
                                            />
                                            Resetting...
                                        </span>
                                    ) : (
                                        "Reset Password"
                                    )}
                                </Button>
                            </form>
                        )}
                    </div>

                    {/* Back to login */}
                    <p className="mt-6 text-center">
                        <Link
                            href="/auth/login"
                            className="text-xs font-bold text-primary hover:underline underline-offset-2"
                        >
                            ← Back to sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
