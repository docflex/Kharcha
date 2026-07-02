"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, ScanText, BarChart3, Brain, Sparkles, ArrowRight } from "lucide-react";

const features = [
    {
        icon: ScanText,
        title: "OCR Upload",
        description:
            "Upload Buddy screenshots and extract expenses automatically with Tesseract OCR.",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
        icon: BarChart3,
        title: "Analytics",
        description:
            "Month-over-month trends, category breakdowns, heatmaps, and year-over-year comparisons.",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
        icon: Brain,
        title: "Persona Engine",
        description:
            "Get a monthly spending persona with AI-driven insights and actionable recommendations.",
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
        icon: Sparkles,
        title: "100% Free",
        description:
            "No subscriptions, no ads, no data selling. Your finances stay private, always.",
        color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
];

export function LandingPage() {
    const { setTheme, theme } = useTheme();

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Theme toggle */}
            <div className="absolute right-4 top-4 z-10">
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

            {/* Hero Section */}
            <section className="flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-12 md:pt-24 md:pb-16">
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                    }}
                    className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-primary-foreground border-3 border-foreground shadow-[5px_5px_0px_0px] shadow-foreground text-3xl font-black md:h-24 md:w-24 md:text-4xl"
                >
                    ₹
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-black uppercase tracking-tight md:text-6xl"
                >
                    Kha₹cha
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-center font-mono text-sm text-muted-foreground uppercase tracking-widest md:text-base"
                >
                    See where your money flows
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 flex flex-col gap-3 sm:flex-row"
                >
                    <Link href="/auth/register">
                        <Button className="h-12 px-8 border-2 border-foreground shadow-[4px_4px_0px_0px] shadow-foreground font-black uppercase tracking-wider text-sm hover:shadow-[5px_5px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all">
                            Get Started
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/auth/login">
                        <Button
                            variant="outline"
                            className="h-12 px-8 border-2 border-border font-bold uppercase tracking-wider text-sm hover:bg-muted transition-colors"
                        >
                            Sign In
                        </Button>
                    </Link>
                </motion.div>
            </section>

            {/* Feature Cards */}
            <section className="mx-auto w-full max-w-5xl px-4 pb-16 md:pb-24">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + i * 0.1 }}
                            className="rounded-lg border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px] shadow-border/50 hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                        >
                            <div
                                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${feature.color}`}
                            >
                                <feature.icon className="h-5 w-5" strokeWidth={2.5} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-wider">
                                {feature.title}
                            </h3>
                            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t-2 border-border py-6 text-center">
                <p className="text-xs font-mono text-muted-foreground">Built with ☕ and Next.js</p>
            </footer>
        </div>
    );
}
