"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTheme } from "@/components/providers/theme-provider";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setTheme, theme } = useTheme();
    const [mode, setMode] = useState<"login" | "register">(
        searchParams.get("mode") === "register" ? "register" : "login"
    );
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const oauthError = searchParams.get("error");
    const oauthErrorMessage =
        oauthError === "OAuthAccountNotLinked"
            ? "This email is already registered. Please sign in with your password first."
            : oauthError === "Configuration"
              ? "OAuth configuration error — check server logs."
              : oauthError
                ? `Authentication error: ${oauthError}`
                : "";
    const [error, setError] = useState(oauthErrorMessage);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (mode === "register") {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Registration failed");
                    setLoading(false);
                    return;
                }
            }

            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                if (mode === "register") {
                    setError("Account created but could not sign in. Try signing in below.");
                    setMode("login");
                } else if (result.status === 401) {
                    setError("Invalid email or password");
                } else if (result.error === "CallbackRouteError") {
                    setError("Server error during sign-in — check console for details");
                } else {
                    setError(result.error);
                }
                setLoading(false);
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            console.error(`[auth] ${mode} failed:`, err);
            setError(
                err instanceof Error && err.message.includes("fetch")
                    ? "Network error — unable to reach the server"
                    : "Something went wrong. Please try again."
            );
            setLoading(false);
        }
    }

    const isRegister = mode === "register";

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Theme toggle in corner */}
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
                    {/* Logo + Title */}
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
                        <h1 className="text-2xl font-black uppercase tracking-tight">Kha₹cha</h1>
                        <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
                            Expense Tracker
                        </p>
                    </div>

                    {/* Card */}
                    <div className="rounded-lg border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px] shadow-border/50">
                        {/* Google Sign In */}
                        <Button
                            variant="outline"
                            className="w-full border-2 border-border font-bold hover:bg-muted transition-colors h-10"
                            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </Button>

                        {/* Divider */}
                        <div className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t-2 border-border" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    or email
                                </span>
                            </div>
                        </div>

                        {/* Mode toggle */}
                        <div className="flex rounded-md border-2 border-border mb-4 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("login");
                                    setError("");
                                }}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    !isRegister
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("register");
                                    setError("");
                                }}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors border-l-2 border-border ${
                                    isRegister
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Create Account
                            </button>
                        </div>

                        {/* Form */}
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

                            <AnimatePresence mode="wait">
                                {isRegister && (
                                    <motion.div
                                        key="name-field"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-1.5 overflow-hidden"
                                    >
                                        <Label
                                            htmlFor="name"
                                            className="text-xs font-bold uppercase tracking-widest"
                                        >
                                            Name
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required={isRegister}
                                            className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-bold uppercase tracking-widest"
                                >
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-bold uppercase tracking-widest"
                                >
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={isRegister ? "Min 8 characters" : "••••••••"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={isRegister ? 8 : undefined}
                                    className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                                />
                            </div>
                            {!isRegister && (
                                <div className="flex justify-end">
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full h-10 border-2 border-foreground shadow-[3px_3px_0px_0px] shadow-foreground font-black uppercase tracking-wider text-xs hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                disabled={loading}
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
                                        {isRegister ? "Creating..." : "Signing in..."}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {isRegister ? "Create Account" : "Sign In"}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
